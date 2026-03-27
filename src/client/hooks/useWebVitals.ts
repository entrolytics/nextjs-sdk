'use client';

import { API_ROUTES } from '@entrolytics/shared';
import type { NavigationType, VitalRating, VitalType } from '@entrolytics/shared';
import { useCallback, useEffect, useRef } from 'react';
import { useEntrolytics } from './useEntrolytics';

export type WebVitalMetric = VitalType;
export type WebVitalRating = VitalRating;
export type { NavigationType };

export interface WebVitalData {
  metric: WebVitalMetric;
  value: number;
  rating: WebVitalRating;
  delta?: number;
  id?: string;
  navigationType?: NavigationType;
  attribution?: Record<string, unknown>;
}

export interface UseWebVitalsOptions {
  /** Auto-initialize web-vitals library (default: true) */
  autoInit?: boolean;
  /** Report all changes (default: false) */
  reportAllChanges?: boolean;
}

/**
 * Hook for tracking Web Vitals in Next.js App Router
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useWebVitals } from '@entrolytics/nextjs';
 *
 * export function WebVitalsTracker() {
 *   useWebVitals(); // Auto-tracks all Core Web Vitals
 *   return null;
 * }
 * ```
 */
export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const { autoInit = true, reportAllChanges = false } = options;
  const { config, isReady } = useEntrolytics();
  const initialized = useRef(false);

  const trackVital = useCallback(
    async (data: WebVitalData) => {
      if (typeof window === 'undefined') return;

      const host = config.host || 'https://entrolytics.click';
      const payload = {
        websiteId: config.websiteId,
        metricName: data.metric,
        metricValue: data.value,
        rating: data.rating,
        delta: data.delta,
        id: data.id,
        navigationType: data.navigationType,
        attribution: data.attribution,
        url: window.location.href,
        path: window.location.pathname,
      };

      try {
        await fetch(`${host}${API_ROUTES.collectVitals}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      } catch (err) {
        console.error('[Entrolytics] Failed to track vital:', err);
      }
    },
    [config.websiteId, config.host],
  );

  useEffect(() => {
    if (!autoInit || !isReady || initialized.current) return;
    if (typeof window === 'undefined') return;

    initialized.current = true;

    import('web-vitals/attribution')
      .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
        const opts = { reportAllChanges };

        onLCP(
          m =>
            trackVital({
              metric: 'LCP',
              value: m.value,
              rating: m.rating,
              delta: m.delta,
              id: m.id,
              navigationType: m.navigationType as NavigationType,
              attribution: m.attribution as unknown as Record<string, unknown>,
            }),
          opts,
        );

        onINP(
          m =>
            trackVital({
              metric: 'INP',
              value: m.value,
              rating: m.rating,
              delta: m.delta,
              id: m.id,
              navigationType: m.navigationType as NavigationType,
              attribution: m.attribution as unknown as Record<string, unknown>,
            }),
          opts,
        );

        onCLS(
          m =>
            trackVital({
              metric: 'CLS',
              value: m.value,
              rating: m.rating,
              delta: m.delta,
              id: m.id,
              navigationType: m.navigationType as NavigationType,
              attribution: m.attribution as unknown as Record<string, unknown>,
            }),
          opts,
        );

        onFCP(
          m =>
            trackVital({
              metric: 'FCP',
              value: m.value,
              rating: m.rating,
              delta: m.delta,
              id: m.id,
              navigationType: m.navigationType as NavigationType,
              attribution: m.attribution as unknown as Record<string, unknown>,
            }),
          opts,
        );

        onTTFB(
          m =>
            trackVital({
              metric: 'TTFB',
              value: m.value,
              rating: m.rating,
              delta: m.delta,
              id: m.id,
              navigationType: m.navigationType as NavigationType,
              attribution: m.attribution as unknown as Record<string, unknown>,
            }),
          opts,
        );
      })
      .catch(() => {
        console.debug('[Entrolytics] web-vitals not found. Use trackVital() for manual tracking.');
      });
  }, [autoInit, isReady, trackVital, reportAllChanges]);

  return { trackVital };
}
