import type { NextRequest } from 'next/server';
import type { EventData } from '../types';

interface ServerTrackConfig {
  /** Entrolytics host URL */
  host: string;
  /** Website ID (use one of: websiteId, linkId, or pixelId) */
  websiteId?: string;
  /** Link ID for link tracking */
  linkId?: string;
  /** Pixel ID for conversion tracking */
  pixelId?: string;
}

interface ServerTrackOptions {
  /** Event name */
  event?: string;
  /** Event data */
  data?: EventData;
  /** URL to track */
  url?: string;
  /** Page title */
  title?: string;
  /** Referrer */
  referrer?: string;
  /** Distinct ID for user tracking */
  id?: string;
  /** Tag for segmentation */
  tag?: string;
  /** Extract info from request */
  request?: NextRequest | Request;
}

/**
 * Track an event from the server side (API routes, Server Actions, middleware).
 *
 * @example
 * ```ts
 * // In an API route or Server Action
 * import { trackServerEvent } from '@entrolytics/nextjs/server';
 *
 * export async function POST(request: Request) {
 *   await trackServerEvent(
 *     {
 *       host: process.env.ENTROLYTICS_HOST!,
 *       websiteId: process.env.ENTROLYTICS_WEBSITE_ID!,
 *     },
 *     {
 *       event: 'api-call',
 *       data: { endpoint: '/api/users' },
 *       request,
 *     }
 *   );
 *
 *   return Response.json({ success: true });
 * }
 * ```
 */
export async function trackServerEvent(
  config: ServerTrackConfig,
  options: ServerTrackOptions = {},
): Promise<{ ok: boolean; error?: string }> {
  const { host, websiteId, linkId, pixelId } = config;
  const { event, data, url, title, referrer, id, tag, request } = options;

  const baseUrl = host.replace(/\/$/, '');

  // Extract info from request if provided
  let hostname = 'server';
  let language = 'en';
  let userAgent = '';
  let ip = '';
  let requestUrl = url || '/';
  let requestReferrer = referrer || '';

  if (request) {
    const headers = request.headers;
    hostname = headers.get('host') || 'server';
    language = headers.get('accept-language')?.split(',')[0] || 'en';
    userAgent = headers.get('user-agent') || '';
    ip = headers.get('x-forwarded-for')?.split(',')[0] || headers.get('x-real-ip') || '';

    if (request instanceof Request && request.url) {
      try {
        const reqUrl = new URL(request.url);
        if (!url) requestUrl = reqUrl.pathname + reqUrl.search;
      } catch {
        // Invalid URL, use default
      }
    }

    if (!referrer) {
      requestReferrer = headers.get('referer') || '';
    }
  }

  const payload: Record<string, unknown> = {
    hostname,
    language,
    screen: '0x0',
    url: requestUrl,
    title: title || '',
    referrer: requestReferrer,
    ...(event && { name: event }),
    ...(data && { data }),
    ...(id && { id }),
    ...(tag && { tag }),
  };

  // Add the appropriate ID type
  if (websiteId) payload.website = websiteId;
  else if (linkId) payload.link = linkId;
  else if (pixelId) payload.pixel = pixelId;

  try {
    const response = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        ...(ip && { 'X-Forwarded-For': ip }),
      },
      body: JSON.stringify({
        type: 'event',
        payload,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Track an identify event from the server side.
 *
 * @example
 * ```ts
 * import { identifyServerSession } from '@entrolytics/nextjs/server';
 *
 * await identifyServerSession(
 *   { host: '...', websiteId: '...' },
 *   {
 *     id: 'user-123',
 *     data: { plan: 'premium', region: 'us-west' },
 *   }
 * );
 * ```
 */
export async function identifyServerSession(
  config: ServerTrackConfig,
  options: Pick<ServerTrackOptions, 'id' | 'data' | 'request'>,
): Promise<{ ok: boolean; error?: string }> {
  const { host, websiteId } = config;
  const { id, data, request } = options;

  const baseUrl = host.replace(/\/$/, '');

  // Extract info from request
  let hostname = 'server';
  let language = 'en';
  let userAgent = '';
  let ip = '';

  if (request) {
    const headers = request.headers;
    hostname = headers.get('host') || 'server';
    language = headers.get('accept-language')?.split(',')[0] || 'en';
    userAgent = headers.get('user-agent') || '';
    ip = headers.get('x-forwarded-for')?.split(',')[0] || headers.get('x-real-ip') || '';
  }

  const payload = {
    website: websiteId,
    hostname,
    language,
    screen: '0x0',
    url: '/',
    title: '',
    referrer: '',
    ...(id && { id }),
    ...(data && { data }),
  };

  try {
    const response = await fetch(`${baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        ...(ip && { 'X-Forwarded-For': ip }),
      },
      body: JSON.stringify({
        type: 'identify',
        payload,
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
