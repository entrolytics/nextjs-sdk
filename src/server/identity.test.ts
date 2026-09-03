import { describe, expect, it } from 'vitest';

import { generateUuid, resolveSessionVisitorIds } from './identity';

describe('server identity', () => {
  it('generates RFC 4122 version 4 identifiers', () => {
    expect(generateUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('preserves explicit request-scoped identifiers', () => {
    expect(resolveSessionVisitorIds({ sessionId: 'session', visitorId: 'visitor' })).toEqual({
      sessionId: 'session',
      visitorId: 'visitor',
    });
  });
});
