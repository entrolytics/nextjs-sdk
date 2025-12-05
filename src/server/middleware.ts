import type { NextRequest, NextResponse } from 'next/server';

interface MiddlewareConfig {
  /** Entrolytics host URL */
  host: string;
  /** Website ID */
  websiteId: string;
  /** Route patterns to track (glob patterns) */
  trackRoutes?: string[];
  /** Route patterns to exclude */
  excludeRoutes?: string[];
  /** Tag for segmentation */
  tag?: string;
}

type MiddlewareHandler = (
  request: NextRequest,
  response?: NextResponse,
) => Promise<NextResponse | Response | undefined> | NextResponse | Response | undefined;

/**
 * Creates a middleware wrapper that tracks requests to specified routes.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { withEntrolyticsMiddleware } from '@entrolytics/nextjs/server';
 * import { NextResponse } from 'next/server';
 *
 * const entrolyticsMiddleware = withEntrolyticsMiddleware({
 *   host: process.env.ENTROLYTICS_HOST!,
 *   websiteId: process.env.ENTROLYTICS_NG_WEBSITE_ID!,
 *   trackRoutes: ['/api/*'],
 *   excludeRoutes: ['/api/health', '/api/collect/*'],
 * });
 *
 * export async function middleware(request: NextRequest) {
 *   // Your custom middleware logic
 *   const response = NextResponse.next();
 *
 *   // Track with Entrolytics
 *   return entrolyticsMiddleware(request, response);
 * }
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * };
 * ```
 */
export function withEntrolyticsMiddleware(config: MiddlewareConfig): MiddlewareHandler {
  const {
    host,
    websiteId,
    trackRoutes = [],
    excludeRoutes = ['/api/collect', '/_next', '/favicon.ico'],
    tag,
  } = config;

  const baseUrl = host.replace(/\/$/, '');

  // Convert glob patterns to regex
  const routeToRegex = (pattern: string): RegExp => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  };

  const trackPatterns = trackRoutes.map(routeToRegex);
  const excludePatterns = excludeRoutes.map(routeToRegex);

  const shouldTrack = (pathname: string): boolean => {
    // Check exclusions first
    if (excludePatterns.some(pattern => pattern.test(pathname))) {
      return false;
    }

    // If no track patterns specified, track all (except excluded)
    if (trackPatterns.length === 0) {
      return false; // Default to not tracking unless specified
    }

    return trackPatterns.some(pattern => pattern.test(pathname));
  };

  return async (request: NextRequest, response?: NextResponse) => {
    const { pathname } = request.nextUrl;

    if (shouldTrack(pathname)) {
      // Track asynchronously without blocking the response
      const headers = request.headers;
      const hostname = headers.get('host') || 'server';
      const language = headers.get('accept-language')?.split(',')[0] || 'en';
      const userAgent = headers.get('user-agent') || '';
      const ip = headers.get('x-forwarded-for')?.split(',')[0] || headers.get('x-real-ip') || '';

      const payload = {
        website: websiteId,
        hostname,
        language,
        screen: '0x0',
        url: pathname + request.nextUrl.search,
        title: '',
        referrer: headers.get('referer') || '',
        name: 'middleware-request',
        data: {
          method: request.method,
          pathname,
        },
        ...(tag && { tag }),
      };

      // Fire and forget - don't await
      fetch(`${baseUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          ...(ip && { 'X-Forwarded-For': ip }),
        },
        body: JSON.stringify({
          type: 'event',
          payload,
        }),
      }).catch(error => {
        console.error('[Entrolytics Middleware] tracking error:', error);
      });
    }

    return response;
  };
}

/**
 * Compose multiple middleware functions.
 *
 * @example
 * ```ts
 * import { composeMiddleware, withEntrolyticsMiddleware } from '@entrolytics/nextjs/server';
 *
 * const entrolytics = withEntrolyticsMiddleware({ ... });
 * const auth = withAuthMiddleware({ ... });
 *
 * export const middleware = composeMiddleware(entrolytics, auth);
 * ```
 */
export function composeMiddleware(...middlewares: MiddlewareHandler[]): MiddlewareHandler {
  return async (request: NextRequest, initialResponse?: NextResponse) => {
    let response = initialResponse;

    for (const middleware of middlewares) {
      const result = await middleware(request, response);
      if (result) {
        response = result as NextResponse;
      }
    }

    return response;
  };
}
