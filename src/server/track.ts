import type { NextRequest } from 'next/server';
import type { EventData } from '../types';
import { resolveSessionVisitorIds } from './identity';

interface ServerTrackConfig {
  /** Entrolytics host URL */
  host: string;
  /** Public collection API key */
  apiKey: string;
  /** Website ID (use one of: websiteId, linkId, or pixelId) */
  websiteId?: string;
  /** @deprecated Not supported by collect contract */
  linkId?: string;
  /** @deprecated Not supported by collect contract */
  pixelId?: string;
  /** Optional stable session ID */
  sessionId?: string;
  /** Optional stable visitor ID */
  visitorId?: string;
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

interface RequestMetadata {
  hostname: string;
  ip: string;
  language: string;
  referrer: string;
  requestUrl: string;
  userAgent: string;
}

function extractRequestMetadata(request?: NextRequest | Request): RequestMetadata {
  if (!request) {
    return {
      hostname: 'server',
      ip: '',
      language: 'en',
      referrer: '',
      requestUrl: '/',
      userAgent: '',
    };
  }

  const headers = request.headers;
  const host = headers.get('host') || 'server';
  const protocol = headers.get('x-forwarded-proto') || 'https';

  let requestUrl = '/';
  try {
    const parsed = new URL(request.url);
    requestUrl = parsed.pathname + parsed.search;
  } catch {
    // Keep default
  }

  return {
    hostname: host,
    ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '',
    language: headers.get('accept-language')?.split(',')[0] || 'en',
    referrer: headers.get('referer') || '',
    requestUrl,
    userAgent: headers.get('user-agent') || `${protocol} server`,
  };
}

function toAbsoluteUrl(
  rawUrl: string,
  request?: NextRequest | Request,
  fallbackHost = 'server',
): string {
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;

  if (request) {
    try {
      const parsed = new URL(request.url);
      return `${parsed.origin}${cleanPath}`;
    } catch {
      // Continue to host-based fallback
    }
  }

  const normalizedHost = fallbackHost || 'localhost';
  return `https://${normalizedHost}${cleanPath}`;
}

function toValidReferrer(rawReferrer: string | undefined): string | undefined {
  if (!rawReferrer) return undefined;

  if (/^https?:\/\//i.test(rawReferrer)) {
    return rawReferrer;
  }

  return undefined;
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
  const { host, websiteId, apiKey } = config;
  const { event, data, url, title, referrer, id, tag, request } = options;

  if (!websiteId) {
    return {
      ok: false,
      error: 'websiteId is required for collect contract (linkId/pixelId are unsupported)',
    };
  }

  const baseUrl = host.replace(/\/$/, '');
  const metadata = extractRequestMetadata(request);
  const { sessionId, visitorId } = resolveSessionVisitorIds(config);

  const payloadProperties: EventData = {
    ...data,
  };

  if (title) payloadProperties.title = title;
  if (tag) payloadProperties.tag = tag;
  if (id) payloadProperties.distinctId = id;
  payloadProperties.hostname = metadata.hostname;
  payloadProperties.language = metadata.language;

  const eventUrl = toAbsoluteUrl(url || metadata.requestUrl || '/', request, metadata.hostname);
  const eventReferrer = toValidReferrer(referrer || metadata.referrer);

  const payload = {
    websiteId,
    sessionId,
    visitorId,
    url: eventUrl,
    eventType: event ? 'custom_event' : 'pageview',
    ...(event && { eventName: event }),
    ...(eventReferrer && { referrer: eventReferrer }),
    ...(Object.keys(payloadProperties).length > 0 && { properties: payloadProperties }),
  };

  try {
    const response = await fetch(`${baseUrl}/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        ...(metadata.userAgent && { 'User-Agent': metadata.userAgent }),
        ...(metadata.ip && { 'X-Forwarded-For': metadata.ip }),
      },
      body: JSON.stringify(payload),
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
  const identifyData: EventData = {
    ...options.data,
  };

  if (options.id) {
    identifyData.distinctId = options.id;
  }

  return trackServerEvent(config, {
    event: 'identify',
    data: identifyData,
    request: options.request,
  });
}
