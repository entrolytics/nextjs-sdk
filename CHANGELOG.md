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
- `/collect` events from `trackServerEvent`, `identifyServerSession` and
  `withEntrolyticsMiddleware` did not say how long their `visitorId` identifies the visitor, so
  the API's retention report, which counts only persistent visitor ids, could not use any
  server-side traffic. They now send `visitorIdScope`: `persistent` for a configured `visitorId`,
  `daily` for the id derived from the request's IP address and user agent; it is left out for a
  random id. Tracker payloads forwarded by `createProxyHandler` are unchanged.
