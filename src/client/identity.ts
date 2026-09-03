'use client';

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

const SESSION_KEY = '__entro_sid';
const SESSION_IDLE_MS = 30 * 60 * 1000;
let visitorDay: string | undefined;
let visitorId: string | undefined;

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateUuid();

  const now = Date.now();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null') as unknown;
    if (
      typeof stored === 'object' &&
      stored !== null &&
      'id' in stored &&
      'lastActivity' in stored &&
      typeof stored.id === 'string' &&
      typeof stored.lastActivity === 'number' &&
      now - stored.lastActivity < SESSION_IDLE_MS
    ) {
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ id: stored.id, lastActivity: now }),
      );
      return stored.id;
    }
  } catch {
    // Storage can be unavailable; generate an in-memory session.
  }

  const sessionId = generateUuid();
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id: sessionId, lastActivity: now }),
    );
  } catch {
    // Storage can be unavailable; return the generated session.
  }
  return sessionId;
}

export function getOrCreateVisitorId(): string {
  const currentDay = new Date().toISOString().slice(0, 10);
  if (!visitorId || visitorDay !== currentDay) {
    visitorDay = currentDay;
    visitorId = generateUuid();
  }
  return visitorId;
}

export function buildCollectionHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}
