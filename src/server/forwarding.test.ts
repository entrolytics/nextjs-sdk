import { afterEach, describe, expect, it, vi } from 'vitest';

import { withEntrolyticsMiddleware } from './middleware';
import { createProxyHandler } from './proxy';
import { trackServerEvent } from './track';

const websiteId = '6f1c7c8e-5d3b-4f5a-9d1e-2b6f0c9a7e41';
const browser = 'Mozilla/5.0 (Macintosh) Safari/605.1.15';

function recordFetch() {
  const calls: { body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    calls.push({
      body: JSON.parse(String(init.body)) as Record<string, unknown>,
      headers: init.headers as Record<string, string>,
    });
    return Response.json({ status: 'ok' }, { status: 202 });
  });
  return calls;
}

function visitorRequest(ip: string, init: RequestInit = {}) {
  return new Request('https://shop.example.test/pricing', {
    ...init,
    headers: { 'user-agent': browser, 'x-forwarded-for': ip, ...init.headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('server-side collection', () => {
  it("counts one visitor per browser, not per call, and forwards the visitor's user agent", async () => {
    const calls = recordFetch();
    const config = { apiKey: 'ent_test', host: 'https://api.example.test', websiteId };

    await trackServerEvent(config, { event: 'signup', request: visitorRequest('203.0.113.7') });
    await trackServerEvent(config, { request: visitorRequest('203.0.113.7') });
    await trackServerEvent(config, { request: visitorRequest('198.51.100.4') });

    const [first, second, third] = calls;
    expect(first?.body.visitorId).toBe(second?.body.visitorId);
    expect(third?.body.visitorId).not.toBe(first?.body.visitorId);
    expect(first?.headers['X-Forwarded-User-Agent']).toBe(browser);
    expect(first?.headers['X-Forwarded-For']).toBe('203.0.113.7');
    expect(first?.headers['User-Agent']).toBeUndefined();
  });

  it('forwards proxied tracker events as the browser requests they are', async () => {
    const calls = recordFetch();
    const { POST } = createProxyHandler({ apiKey: 'ent_test', host: 'https://api.example.test' });
    const request = visitorRequest('203.0.113.7', {
      body: JSON.stringify({ eventType: 'pageview', websiteId }),
      headers: { origin: 'https://shop.example.test' },
      method: 'POST',
    });

    // The handler only reads the standard Request surface of a NextRequest.
    await POST(request as Parameters<typeof POST>[0]);

    expect(calls[0]?.headers.Origin).toBe('https://shop.example.test');
    expect(calls[0]?.headers['X-Forwarded-User-Agent']).toBe(browser);
    expect(calls[0]?.headers['X-Forwarded-For']).toBe('203.0.113.7');
  });

  it('counts one session per visitor per half hour, not per call', async () => {
    const calls = recordFetch();
    const config = { apiKey: 'ent_test', host: 'https://api.example.test', websiteId };
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date('2026-09-24T14:30:00Z'));
    await trackServerEvent(config, { event: 'signup', request: visitorRequest('203.0.113.7') });
    vi.setSystemTime(new Date('2026-09-24T14:59:59Z'));
    await trackServerEvent(config, { request: visitorRequest('203.0.113.7') });
    vi.setSystemTime(new Date('2026-09-24T15:00:00Z'));
    await trackServerEvent(config, { request: visitorRequest('203.0.113.7') });
    await trackServerEvent(
      { ...config, sessionId: 'explicit' },
      { request: visitorRequest('203.0.113.7') },
    );

    expect(calls.map(call => call.body.sessionId)).toEqual([
      '6e75928f-813d-49ee-a4dc-5d2e299d7eb2',
      '6e75928f-813d-49ee-a4dc-5d2e299d7eb2',
      'f656564a-ee6c-4cc1-8309-0b69c73bfd3d',
      'explicit',
    ]);
  });

  it('derives the session of middleware-tracked requests', async () => {
    const calls = recordFetch();
    vi.useFakeTimers({ now: new Date('2026-09-24T14:47:00Z'), toFake: ['Date'] });
    const middleware = withEntrolyticsMiddleware({
      apiKey: 'ent_test',
      host: 'https://api.example.test',
      trackRoutes: ['/pricing'],
      websiteId,
    });
    const request = Object.assign(visitorRequest('203.0.113.7'), {
      nextUrl: new URL('https://shop.example.test/pricing'),
    });

    // The middleware only reads nextUrl and the standard Request surface of a NextRequest.
    await middleware(request as unknown as Parameters<typeof middleware>[0]);
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    expect(calls[0]?.body.sessionId).toBe('6e75928f-813d-49ee-a4dc-5d2e299d7eb2');
  });

  it("keeps the tracker's session id and derives one only for payloads without it", async () => {
    const calls = recordFetch();
    vi.useFakeTimers({ now: new Date('2026-09-24T14:47:00Z'), toFake: ['Date'] });
    const { POST } = createProxyHandler({ apiKey: 'ent_test', host: 'https://api.example.test' });
    const post = (body: Record<string, unknown>) =>
      POST(
        visitorRequest('203.0.113.7', {
          body: JSON.stringify({ eventType: 'pageview', websiteId, ...body }),
          method: 'POST',
        }) as Parameters<typeof POST>[0],
      );

    await post({ sessionId: 'tracker-session' });
    await post({});

    expect(calls[0]?.body.sessionId).toBe('tracker-session');
    expect(calls[1]?.body.sessionId).toBe('6e75928f-813d-49ee-a4dc-5d2e299d7eb2');
  });
});
