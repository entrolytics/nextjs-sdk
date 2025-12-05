'use client';

import type { ReactNode } from 'react';
import type { EntrolyticsConfig } from '../../types';
import { EntrolyticsProvider } from '../provider';

export interface AnalyticsProps extends Partial<EntrolyticsConfig> {
  /**
   * Website ID - defaults to NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID
   */
  websiteId?: string;
  /**
   * API host - defaults to NEXT_PUBLIC_ENTROLYTICS_HOST
   */
  host?: string;
  /**
   * Optional children to wrap (rarely needed)
   */
  children?: ReactNode;
}

/**
 * Zero-config Analytics component that automatically reads from environment variables.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { Analytics } from '@entrolytics/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <Analytics />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * Environment variables (in .env.local):
 * - NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID (required)
 * - NEXT_PUBLIC_ENTROLYTICS_HOST (optional)
 */
export function Analytics({ websiteId, host, children, ...config }: AnalyticsProps) {
  const finalWebsiteId = websiteId || process.env.NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID;
  const finalHost = host || process.env.NEXT_PUBLIC_ENTROLYTICS_HOST;

  // Show helpful warnings in development
  if (process.env.NODE_ENV === 'development') {
    if (!finalWebsiteId) {
      console.warn(
        '[Entrolytics] Missing NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID environment variable. Add it to .env.local or pass as prop.',
      );
      return null;
    }

    if (config.debug) {
      console.log('[Entrolytics] Initialized with:', {
        websiteId: finalWebsiteId,
        host: finalHost || 'default',
        config,
      });
    }
  }

  // In production, silently skip if no website ID
  if (!finalWebsiteId) {
    return null;
  }

  return (
    <EntrolyticsProvider websiteId={finalWebsiteId} host={finalHost} {...config}>
      {children}
    </EntrolyticsProvider>
  );
}
