'use client';

import { useCallback } from 'react';
import type { EventData } from '../../types';
import { useEntrolytics } from './useEntrolytics';

interface UseEventTrackerOptions {
  /** Default event name */
  eventName?: string;
  /** Default event data */
  defaultData?: EventData;
}

interface EventTrackerReturn {
  /** Track an event with optional name and data overrides */
  trackEvent: (name?: string, data?: EventData) => Promise<void>;
  /** Create a click handler that tracks an event */
  createClickHandler: (name?: string, data?: EventData) => (e?: React.MouseEvent) => Promise<void>;
  /** Whether tracking is ready */
  isReady: boolean;
}

/**
 * Hook for convenient event tracking with defaults.
 *
 * @example
 * ```tsx
 * const { trackEvent, createClickHandler } = useEventTracker({
 *   eventName: 'button-click',
 *   defaultData: { section: 'header' }
 * });
 *
 * // Track with defaults
 * trackEvent();
 *
 * // Override name
 * trackEvent('custom-event');
 *
 * // Override data
 * trackEvent('custom-event', { action: 'submit' });
 *
 * // Use as click handler
 * <button onClick={createClickHandler()}>Click me</button>
 *
 * // With custom data per click
 * <button onClick={createClickHandler('signup', { plan: 'free' })}>Sign Up</button>
 * ```
 */
export function useEventTracker(options: UseEventTrackerOptions = {}): EventTrackerReturn {
  const { eventName, defaultData } = options;
  const { track, isReady } = useEntrolytics();

  const trackEvent = useCallback(
    async (name?: string, data?: EventData): Promise<void> => {
      const finalName = name || eventName;
      const finalData: EventData = { ...defaultData, ...data };

      if (finalName) {
        const hasData = Object.keys(finalData).length > 0;
        if (hasData) {
          await track(finalName, finalData);
        } else {
          await track(finalName);
        }
      } else {
        await track();
      }
    },
    [track, eventName, defaultData],
  );

  const createClickHandler = useCallback(
    (name?: string, data?: EventData) => {
      return async (_e?: React.MouseEvent): Promise<void> => {
        await trackEvent(name, data);
      };
    },
    [trackEvent],
  );

  return {
    trackEvent,
    createClickHandler,
    isReady,
  };
}
