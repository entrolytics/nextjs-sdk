'use client';

import NextScript from 'next/script';
import type { EntrolyticsConfig } from '../../types';

interface ScriptProps
  extends Pick<
    EntrolyticsConfig,
    'websiteId' | 'linkId' | 'pixelId' | 'host' | 'proxy' | 'scriptName'
  > {
  /** Additional data attributes */
  autoTrack?: boolean;
  domains?: string[];
  tag?: string;
  excludeSearch?: boolean;
  excludeHash?: boolean;
  respectDoNotTrack?: boolean;
  beforeSend?: string;
}

/**
 * Script component for loading the Entrolytics tracker.
 * Use this as an alternative to EntrolyticsProvider when you want
 * to use the traditional script-based tracking.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { Script } from '@entrolytics/nextjs';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <Script
 *           websiteId={process.env.NEXT_PUBLIC_ENTROLYTICS_WEBSITE_ID!}
 *           host={process.env.NEXT_PUBLIC_ENTROLYTICS_HOST}
 *         />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */
export function Script({
  websiteId,
  linkId,
  pixelId,
  host,
  proxy,
  scriptName = 'script.js',
  autoTrack = true,
  domains,
  tag,
  excludeSearch,
  excludeHash,
  respectDoNotTrack,
  beforeSend,
}: ScriptProps) {
  // Determine script source
  let src: string;

  if (proxy && typeof proxy === 'object' && proxy.enabled) {
    src = proxy.scriptPath || '/analytics.js';
  } else if (host) {
    src = `${host.replace(/\/$/, '')}/${scriptName}`;
  } else {
    src = `/${scriptName}`;
  }

  return (
    <NextScript
      src={src}
      data-website-id={websiteId}
      data-link-id={linkId}
      data-pixel-id={pixelId}
      data-host-url={host}
      data-auto-track={autoTrack ? undefined : 'false'}
      data-domains={domains?.join(',')}
      data-tag={tag}
      data-exclude-search={excludeSearch ? 'true' : undefined}
      data-exclude-hash={excludeHash ? 'true' : undefined}
      data-do-not-track={respectDoNotTrack ? 'true' : undefined}
      data-before-send={beforeSend}
      strategy="afterInteractive"
    />
  );
}
