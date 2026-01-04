/**
 * Server-side Web Vitals tracking for Next.js
 * Receives vitals from client and forwards to Entrolytics
 */

import { detectDeployment } from './deployment';

// Declare process for environments where it exists
declare const process: { env: Record<string, string | undefined> } | undefined;

export type WebVitalMetric = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';
export type WebVitalRating = 'good' | 'needs-improvement' | 'poor';
export type NavigationType =
  | 'navigate'
  | 'reload'
  | 'back-forward'
  | 'back-forward-cache'
  | 'prerender'
  | 'restore';

export interface WebVitalPayload {
  /** Metric name (LCP, INP, CLS, TTFB, FCP) */
  metric: WebVitalMetric;
  /** Metric value */
  value: number;
  /** Performance rating */
  rating: WebVitalRating;
  /** Delta from previous measurement */
  delta?: number;
  /** Unique metric ID for deduplication */
  id?: string;
  /** Navigation type */
  navigationType?: NavigationType;
  /** Attribution data */
  attribution?: Record<string, unknown>;
  /** Page URL */
  url?: string;
  /** Page path */
  path?: string;
}

export interface TrackVitalsConfig {
  /** Entrolytics host URL */
  host: string;
  /** Website ID */
  websiteId: string;
}

/**
 * Track a Web Vital metric from server side (e.g., from an API route that receives client vitals)
 *
 * @example
 * ```ts
 * // In app/api/vitals/route.ts
 * import { trackServerVital } from '@entrolytics/nextjs/server';
 *
 * export async function POST(request: Request) {
 *   const vital = await request.json();
 *
 *   await trackServerVital(
 *     {
 *       host: process.env.ENTROLYTICS_HOST!,
 *       websiteId: process.env.ENTROLYTICS_WEBSITE_ID!,
 *     },
 *     vital
 *   );
 *
 *   return Response.json({ ok: true });
 * }
 * ```
 */
export async function trackServerVital(
  config: TrackVitalsConfig,
  vital: WebVitalPayload,
): Promise<{ ok: boolean; error?: string }> {
  const { host, websiteId } = config;
  const baseUrl = host.replace(/\/$/, '');

  // Auto-detect deployment info
  const deployment = detectDeployment();

  const payload = {
    website: websiteId,
    metric: vital.metric,
    value: vital.value,
    rating: vital.rating,
    delta: vital.delta,
    id: vital.id,
    navigationType: vital.navigationType,
    attribution: vital.attribution,
    url: vital.url,
    path: vital.path,
    // Add deployment info if available
    deployId: deployment.deployId,
  };

  try {
    const response = await fetch(`${baseUrl}/api/collect/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Track multiple Web Vitals at once
 */
export async function trackServerVitalsBatch(
  config: TrackVitalsConfig,
  vitals: WebVitalPayload[],
): Promise<{ ok: boolean; error?: string }> {
  const { host, websiteId } = config;
  const baseUrl = host.replace(/\/$/, '');

  // Auto-detect deployment info
  const deployment = detectDeployment();

  const payload = {
    website: websiteId,
    vitals: vitals.map(v => ({
      ...v,
      deployId: deployment.deployId,
    })),
  };

  try {
    const response = await fetch(`${baseUrl}/api/collect/vitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a reportWebVitals handler for Next.js
 * Use this in your custom _app.tsx or layout.tsx
 *
 * @example
 * ```ts
 * // In pages/_app.tsx (Pages Router)
 * import { createWebVitalsReporter } from '@entrolytics/nextjs/server';
 *
 * export function reportWebVitals(metric) {
 *   const reporter = createWebVitalsReporter({
 *     host: process.env.NEXT_PUBLIC_ENTROLYTICS_HOST!,
 *     websiteId: process.env.NEXT_PUBLIC_ENTROLYTICS_WEBSITE_ID!,
 *   });
 *   reporter(metric);
 * }
 * ```
 */
export function createWebVitalsReporter(config: TrackVitalsConfig) {
  // Queue for batching
  let queue: WebVitalPayload[] = [];
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (queue.length === 0) return;

    const vitals = [...queue];
    queue = [];

    await trackServerVitalsBatch(config, vitals);
  };

  return (metric: {
    name: string;
    value: number;
    rating?: string;
    delta?: number;
    id?: string;
    navigationType?: string;
    attribution?: Record<string, unknown>;
  }) => {
    // Only track Core Web Vitals
    const validMetrics = ['LCP', 'INP', 'CLS', 'TTFB', 'FCP'];
    if (!validMetrics.includes(metric.name)) return;

    queue.push({
      metric: metric.name as WebVitalMetric,
      value: metric.value,
      rating: (metric.rating as WebVitalRating) || 'good',
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType as NavigationType,
      attribution: metric.attribution,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    // Debounce sending
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(flush, 100);
  };
}
