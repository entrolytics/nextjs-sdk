# Changelog

## [Unreleased]

## [3.0.4] - 2026-11-28

### Changed

- Depends on `@entrolytics/trpc-client` 4.0.0, whose router types describe the API after sign-in
  moved from Clerk to the dashboard itself. Nothing changes at run time.

## [3.0.3] - 2026-11-26

### Changed

- Depends on tRPC 11.31.4.
- Built and released with pnpm 12.24.0.

## [3.0.2] - 2026-11-26

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

[Unreleased]: https://github.com/entrolytics/nextjs-sdk/compare/v3.0.4...HEAD
[3.0.4]: https://github.com/entrolytics/nextjs-sdk/compare/v3.0.3...v3.0.4
[3.0.3]: https://github.com/entrolytics/nextjs-sdk/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/entrolytics/nextjs-sdk/releases/tag/v3.0.2
