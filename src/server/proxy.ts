import type { NextRequest } from 'next/server';
import { resolveSessionVisitorIds } from './identity';

interface ProxyHandlerConfig {
  /** Entrolytics host URL */
  host: string;
  /** Public collection API key */
  apiKey: string;
  /** Website ID (required for cloak mode) */
  websiteId?: string;
  /** Proxy mode: 'direct' passes through, 'cloak' hides websiteId server-side */
  mode?: 'direct' | 'cloak';
}

interface ProxyHandlers {
  GET: (request: NextRequest) => Promise<Response>;
  POST: (request: NextRequest) => Promise<Response>;
}

/**
 * Creates proxy route handlers for ad-blocker bypass.
 *
 * @example
 * ```ts
 * // app/api/collect/[...path]/route.ts
 * import { createProxyHandler } from '@entrolytics/nextjs/server';
 *
 * export const { GET, POST } = createProxyHandler({
 *   host: process.env.ENTROLYTICS_HOST!,
 *   websiteId: process.env.ENTROLYTICS_WEBSITE_ID,
 *   mode: 'cloak',
 * });
 * ```
 */
export function createProxyHandler(config: ProxyHandlerConfig): ProxyHandlers {
  const { host, apiKey, websiteId, mode = 'direct' } = config;
  const baseUrl = host.replace(/\/$/, '');

  const GET = async (request: NextRequest): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/collect/, '');

    try {
      const response = await fetch(`${baseUrl}${path || '/script.js'}`, {
        headers: {
          'User-Agent': request.headers.get('user-agent') || '',
          Accept: request.headers.get('accept') || '*/*',
        },
      });

      let content = await response.text();

      // In cloak mode, inject websiteId into the script
      if (mode === 'cloak' && websiteId && path.endsWith('.js')) {
        // Replace placeholder or inject websiteId
        content = content.replace(/data-website-id="[^"]*"/g, `data-website-id="${websiteId}"`);
      }

      return new Response(content, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/javascript',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (error) {
      console.error('[Entrolytics Proxy] GET error:', error);
      return new Response('Proxy error', { status: 502 });
    }
  };

  const POST = async (request: NextRequest): Promise<Response> => {
    try {
      const body = (await request.json()) as Record<string, unknown>;

      if ('type' in body && 'payload' in body) {
        return Response.json(
          {
            error:
              'Legacy /api/send envelope is not supported in proxy mode. Send collect payload directly.',
          },
          { status: 400 },
        );
      }

      const normalizedPayload: Record<string, unknown> = { ...body };

      // In cloak mode, inject websiteId into the payload
      if (mode === 'cloak' && websiteId) {
        normalizedPayload.websiteId = websiteId;
      }

      if (!normalizedPayload.websiteId || typeof normalizedPayload.websiteId !== 'string') {
        return Response.json({ error: 'websiteId is required' }, { status: 400 });
      }

      if (!normalizedPayload.sessionId || !normalizedPayload.visitorId) {
        const { sessionId, visitorId } = resolveSessionVisitorIds({
          sessionId:
            typeof normalizedPayload.sessionId === 'string'
              ? normalizedPayload.sessionId
              : undefined,
          visitorId:
            typeof normalizedPayload.visitorId === 'string'
              ? normalizedPayload.visitorId
              : undefined,
        });
        normalizedPayload.sessionId = sessionId;
        normalizedPayload.visitorId = visitorId;
      }

      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        '';

      const response = await fetch(`${baseUrl}/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'User-Agent': request.headers.get('user-agent') || '',
          'X-Forwarded-For': clientIp,
          'X-Real-IP': clientIp,
        },
        body: JSON.stringify(normalizedPayload),
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        data = { error: 'Upstream response was not valid JSON' };
      }

      return Response.json(data, {
        status: response.status,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error('[Entrolytics Proxy] POST error:', error);
      return new Response('Proxy error', { status: 502 });
    }
  };

  return { GET, POST };
}

/**
 * Creates a script proxy handler that serves the tracking script.
 *
 * @example
 * ```ts
 * // app/analytics.js/route.ts
 * import { createScriptProxy } from '@entrolytics/nextjs/server';
 *
 * export const GET = createScriptProxy({
 *   host: process.env.ENTROLYTICS_HOST!,
 * });
 * ```
 */
export function createScriptProxy(config: Pick<ProxyHandlerConfig, 'host'>) {
  const { host } = config;
  const baseUrl = host.replace(/\/$/, '');

  return async (_request: NextRequest): Promise<Response> => {
    try {
      const response = await fetch(`${baseUrl}/script.js`);
      const content = await response.text();

      return new Response(content, {
        status: response.status,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (error) {
      console.error('[Entrolytics Script Proxy] error:', error);
      return new Response('// Script unavailable', {
        status: 502,
        headers: { 'Content-Type': 'application/javascript' },
      });
    }
  };
}
