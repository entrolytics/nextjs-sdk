import type { NextConfig } from 'next';

interface EntrolyticsPluginConfig {
  /** Your Entrolytics website ID (required) */
  websiteId: string;
  /** Custom analytics host URL */
  host?: string;
  /** Proxy configuration for ad-blocker bypass */
  proxy?: {
    /** Enable proxy mode */
    enabled: boolean;
    /** Custom path for the tracking script (default: '/analytics.js') */
    scriptPath?: string;
    /** Custom path for the collection endpoint (default: '/api/collect') */
    collectPath?: string;
    /** Proxy mode: 'direct' or 'cloak' */
    mode?: 'direct' | 'cloak';
  };
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Next.js config plugin for Entrolytics.
 *
 * This plugin:
 * - Sets up environment variables for the tracker
 * - Configures rewrites for proxy mode
 * - Adds CSP headers if needed
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withEntrolytics } from '@entrolytics/nextjs/plugin';
 *
 * export default withEntrolytics({
 *   websiteId: process.env.NEXT_PUBLIC_ENTROLYTICS_WEBSITE_ID!,
 *   host: process.env.NEXT_PUBLIC_ENTROLYTICS_HOST,
 *   proxy: {
 *     enabled: true,
 *     mode: 'cloak',
 *   },
 * })({
 *   // Your existing Next.js config
 *   reactStrictMode: true,
 * });
 * ```
 */
export function withEntrolytics(pluginConfig: EntrolyticsPluginConfig) {
  const { websiteId, host, proxy, debug } = pluginConfig;

  return (nextConfig: NextConfig = {}): NextConfig => {
    // Merge environment variables
    const env = {
      ...nextConfig.env,
      NEXT_PUBLIC_ENTROLYTICS_WEBSITE_ID: websiteId,
      ...(host && { NEXT_PUBLIC_ENTROLYTICS_HOST: host }),
      ...(debug && { NEXT_PUBLIC_ENTROLYTICS_DEBUG: 'true' }),
    };

    // Setup rewrites for proxy mode
    const setupRewrites = async () => {
      const existingRewrites = nextConfig.rewrites
        ? await nextConfig.rewrites()
        : { beforeFiles: [], afterFiles: [], fallback: [] };

      // Normalize to object format
      const rewrites = Array.isArray(existingRewrites)
        ? { beforeFiles: existingRewrites, afterFiles: [], fallback: [] }
        : existingRewrites;

      if (proxy?.enabled && host) {
        const scriptPath = proxy.scriptPath || '/analytics.js';
        const collectPath = proxy.collectPath || '/api/collect';
        const baseUrl = host.replace(/\/$/, '');

        // Add proxy rewrites
        rewrites.beforeFiles = [
          ...(rewrites.beforeFiles || []),
          // Script proxy
          {
            source: scriptPath,
            destination: `${baseUrl}/script.js`,
          },
          // Collection endpoint proxy (if not using route handler)
          {
            source: `${collectPath}/:path*`,
            destination: `${baseUrl}/api/send`,
          },
        ];
      }

      return rewrites;
    };

    // Setup headers for CSP
    const setupHeaders = async () => {
      const existingHeaders = nextConfig.headers ? await nextConfig.headers() : [];

      if (host) {
        // Add CSP header to allow connections to analytics host
        const analyticsOrigin = new URL(host).origin;

        existingHeaders.push({
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: `connect-src 'self' ${analyticsOrigin}; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${analyticsOrigin};`,
            },
          ],
        });
      }

      return existingHeaders;
    };

    return {
      ...nextConfig,
      env,
      rewrites: proxy?.enabled ? setupRewrites : nextConfig.rewrites,
      // Only add headers if host is specified and user hasn't disabled it
      ...(host && !nextConfig.headers && { headers: setupHeaders }),
    };
  };
}

/**
 * Helper to create proxy route configuration.
 *
 * @example
 * ```ts
 * import { getProxyRoutes } from '@entrolytics/nextjs/plugin';
 *
 * const routes = getProxyRoutes({
 *   scriptPath: '/stats.js',
 *   collectPath: '/api/stats',
 * });
 *
 * // Use in next.config.ts rewrites
 * ```
 */
export function getProxyRoutes(config: {
  host: string;
  scriptPath?: string;
  collectPath?: string;
}) {
  const { host, scriptPath = '/analytics.js', collectPath = '/api/collect' } = config;
  const baseUrl = host.replace(/\/$/, '');

  return {
    script: {
      source: scriptPath,
      destination: `${baseUrl}/script.js`,
    },
    collect: {
      source: `${collectPath}/:path*`,
      destination: `${baseUrl}/api/send`,
    },
  };
}
