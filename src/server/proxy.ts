import type { NextRequest } from 'next/server';

interface ProxyHandlerConfig {
  /** Entrolytics host URL */
  host: string;
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
  const { host, websiteId, mode = 'direct' } = config;
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
      const body = await request.json();

      // In cloak mode, inject websiteId into the payload
      if (mode === 'cloak' && websiteId && body.payload) {
        body.payload.website = websiteId;
      }

      const clientIp =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        '';

      const response = await fetch(`${baseUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': request.headers.get('user-agent') || '',
          'X-Forwarded-For': clientIp,
          'X-Real-IP': clientIp,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

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
