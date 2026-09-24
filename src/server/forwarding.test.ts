import { afterEach, describe, expect, it, vi } from 'vitest';

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
});
