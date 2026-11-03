import { describe, expect, it } from 'vitest';

import {
  deriveSessionId,
  deriveVisitorId,
  generateUuid,
  resolveRequestSessionId,
  resolveRequestVisitorId,
  resolveSessionVisitorIds,
} from './identity';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const visitor = {
  apiKey: 'ent_test',
  ip: '203.0.113.7',
  userAgent: 'Mozilla/5.0 (Macintosh) Safari/605.1.15',
  websiteId: '6f1c7c8e-5d3b-4f5a-9d1e-2b6f0c9a7e41',
};

describe('server identity', () => {
  it('generates RFC 4122 version 4 identifiers', () => {
    expect(generateUuid()).toMatch(UUID_V4);
  });

  it('preserves explicit request-scoped identifiers', () => {
    expect(resolveSessionVisitorIds({ sessionId: 'session', visitorId: 'visitor' })).toEqual({
      sessionId: 'session',
      visitorId: 'visitor',
    });
  });

  it('derives one visitor per IP address and user agent per day', async () => {
    const day = new Date('2026-09-24T08:00:00Z');
    const later = new Date('2026-09-24T23:59:00Z');
    const nextDay = new Date('2026-09-25T00:01:00Z');

    const id = await deriveVisitorId(visitor, day);
    expect(id).toMatch(UUID_V4);
    expect(await deriveVisitorId(visitor, later)).toBe(id);
    expect(await deriveVisitorId(visitor, nextDay)).not.toBe(id);
    expect(await deriveVisitorId({ ...visitor, ip: '198.51.100.4' }, day)).not.toBe(id);
    expect(await deriveVisitorId({ ...visitor, apiKey: 'ent_other' }, day)).not.toBe(id);
  });

  it('prefers an explicit visitor and falls back to a new id without request context', async () => {
    expect(await resolveRequestVisitorId(visitor, 'explicit')).toBe('explicit');
    const unknown = { ...visitor, ip: '', userAgent: '' };
    expect(await resolveRequestVisitorId(unknown)).not.toBe(await resolveRequestVisitorId(unknown));
  });

  it('derives the visitor and session ids every Entrolytics SDK derives', async () => {
    expect(await deriveVisitorId(visitor, new Date('2026-09-24T14:30:00Z'))).toBe(
      'cb36ddfc-3c30-41b4-8d6a-f3928d890509',
    );
    for (const time of ['2026-09-24T14:30:00Z', '2026-09-24T14:47:00Z', '2026-09-24T14:59:59Z']) {
      expect(await deriveSessionId(visitor, new Date(time))).toBe(
        '6e75928f-813d-49ee-a4dc-5d2e299d7eb2',
      );
    }
    expect(await deriveSessionId(visitor, new Date('2026-09-24T15:00:00Z'))).toBe(
      'f656564a-ee6c-4cc1-8309-0b69c73bfd3d',
    );
  });

  it('prefers an explicit session and falls back to a new id without request context', async () => {
    expect(await resolveRequestSessionId(visitor, 'explicit')).toBe('explicit');
    const unknown = { ...visitor, ip: '', userAgent: '' };
    expect(await resolveRequestSessionId(unknown)).not.toBe(await resolveRequestSessionId(unknown));
  });
});
