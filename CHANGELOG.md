# Changelog

## Unreleased

### Fixed

- `trackServerEvent`, `identifyServerSession` and `withEntrolyticsMiddleware` generated a new
  session id per call, so every server-side event counted as a new visit. When the request carries
  the visitor's IP address or user agent, the session id is now derived from them per 30-minute UTC
  window, cookieless like the visitor id. An explicit `sessionId` still wins; without visitor
  context a new id per call is kept.
- `createProxyHandler` generated a random session id for tracker payloads without one; it now
  derives it the same way. A session id present in the payload is still forwarded unchanged.
