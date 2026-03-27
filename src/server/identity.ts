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
