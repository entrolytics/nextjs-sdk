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
const VISITOR_KEY = '__entro_vid';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateUuid();

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const sessionId = generateUuid();
  window.sessionStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return generateUuid();

  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const visitorId = generateUuid();
  window.localStorage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}

export function buildCollectionHeaders(apiKey?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
  };
}
