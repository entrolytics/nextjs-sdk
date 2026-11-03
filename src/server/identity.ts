export interface SessionVisitorInput {
  sessionId?: string;
  visitorId?: string;
}

export interface SessionVisitorIds {
  sessionId: string;
  visitorId: string;
}

export function generateUuid(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function resolveSessionVisitorIds(input: SessionVisitorInput = {}): SessionVisitorIds {
  return {
    sessionId: input.sessionId || generateUuid(),
    visitorId: input.visitorId || generateUuid(),
  };
}

export interface VisitorRequest {
  apiKey: string;
  websiteId: string;
  /** The visitor's IP address, if known. */
  ip: string;
  /** The visitor's browser user agent, if known. */
  userAgent: string;
}

function toUuidV4(bytes: Uint8Array): string {
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function hmacUuid(apiKey: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKey),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toUuidV4(new Uint8Array(digest).slice(0, 16));
}

/**
 * A site-scoped visitor id that rotates at midnight UTC, derived from the visitor's IP address and
 * user agent.
 *
 * Server-side events carry no browser identifier, and a new id per call counted every event as a
 * new visitor. The API identifies browser visitors the same way, with a daily keyed hash and no
 * cookie, so server-side events follow the same privacy model. The key is the API key, so the id
 * cannot be recomputed from an IP address and user agent alone.
 */
export async function deriveVisitorId(visitor: VisitorRequest, now = new Date()): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  return hmacUuid(
    visitor.apiKey,
    `${visitor.websiteId}\u0000${day}\u0000${visitor.ip}\u0000${visitor.userAgent}`,
  );
}

const SESSION_WINDOW_MS = 30 * 60 * 1000;

/**
 * A session id for the visitor's 30-minute UTC window (starting on the hour and the half hour),
 * derived like the visitor id: a keyed hash of the IP address and user agent, with no cookie.
 *
 * A new id per call counted every server-side event as a new visit. A visit that crosses a window
 * boundary counts as two sessions.
 */
export async function deriveSessionId(visitor: VisitorRequest, now = new Date()): Promise<string> {
  const slot = new Date(Math.floor(now.getTime() / SESSION_WINDOW_MS) * SESSION_WINDOW_MS)
    .toISOString()
    .slice(0, 16);
  return hmacUuid(
    visitor.apiKey,
    `${visitor.websiteId}\u0000session\u0000${slot}\u0000${visitor.ip}\u0000${visitor.userAgent}`,
  );
}

/**
 * The visitor id for an event made on a visitor's behalf: the caller's, else one derived from the
 * visitor's request, else a new one when nothing about the visitor is known.
 */
export async function resolveRequestVisitorId(
  visitor: VisitorRequest,
  explicit?: string,
): Promise<string> {
  if (explicit) return explicit;
  if (!visitor.ip && !visitor.userAgent) return generateUuid();
  return deriveVisitorId(visitor);
}

/**
 * The session id for an event made on a visitor's behalf at `now`: the caller's, else one derived
 * from the visitor's request, else a new one when nothing about the visitor is known.
 */
export async function resolveRequestSessionId(
  visitor: VisitorRequest,
  explicit?: string,
  now = new Date(),
): Promise<string> {
  if (explicit) return explicit;
  if (!visitor.ip && !visitor.userAgent) return generateUuid();
  return deriveSessionId(visitor, now);
}

/**
 * Headers that forward the visitor's user agent and IP address to the API.
 *
 * The API attributes and bot-screens the visitor's user agent only from X-Forwarded-User-Agent.
 * Sent as the request's own User-Agent it was taken for the SDK's, so crawler traffic on a tracked
 * site was never filtered.
 */
export function visitorHeaders(
  visitor: Pick<VisitorRequest, 'ip' | 'userAgent'>,
): Record<string, string> {
  return {
    ...(visitor.userAgent && { 'X-Forwarded-User-Agent': visitor.userAgent }),
    ...(visitor.ip && { 'X-Forwarded-For': visitor.ip }),
  };
}

/** The visitor's IP address as forwarded to this server. */
export function requestIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || '';
}
