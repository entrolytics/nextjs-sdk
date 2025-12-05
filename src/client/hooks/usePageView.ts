'use client';

import { useEffect, useRef } from 'react';
import type { UsePageViewOptions } from '../../types';
import { useEntrolytics } from './useEntrolytics';

/**
 * Hook to track page views with dependency-based triggering.
 *
 * @example
 * ```tsx
 * // Basic usage - tracks on mount
 * usePageView();
 *
 * // Custom URL
 * usePageView({ url: '/custom-path' });
 *
 * // With dependencies - re-tracks when deps change
 * usePageView({ url: virtualPath, deps: [virtualPath] });
 *
 * // Conditional tracking
 * usePageView({ enabled: isAuthenticated });
 * ```
 */
export function usePageView(options: UsePageViewOptions = {}): void {
  const { url, referrer, deps = [], enabled = true } = options;
  const { trackView, isReady, isEnabled } = useEntrolytics();
  const hasTrackedRef = useRef(false);
  const prevDepsRef = useRef<unknown[]>(deps);

  // biome-ignore lint/correctness/useExhaustiveDependencies: deps is intentionally spread and compared manually
  useEffect(() => {
    if (!isReady || !isEnabled || !enabled) return;

    // Check if deps changed
    const depsChanged =
      deps.length > 0 &&
      (deps.length !== prevDepsRef.current.length ||
        deps.some((dep, i) => dep !== prevDepsRef.current[i]));

    // Track if first render or deps changed
    if (!hasTrackedRef.current || depsChanged) {
      trackView(url, referrer);
      hasTrackedRef.current = true;
      prevDepsRef.current = deps;
    }
  }, [isReady, isEnabled, enabled, url, referrer, trackView, ...deps]);
}
