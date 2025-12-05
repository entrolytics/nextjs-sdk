'use client';

import { useContext } from 'react';
import type { EntrolyticsContextValue } from '../../types';
import { EntrolyticsContext } from '../context';

/**
 * Hook to access Entrolytics tracking functions.
 *
 * @example
 * ```tsx
 * const { track, identify, trackRevenue } = useEntrolytics();
 *
 * // Track a page view
 * track();
 *
 * // Track an event
 * track('button-click');
 *
 * // Track an event with data
 * track('signup', { plan: 'premium' });
 *
 * // Identify a user
 * identify('user-123', { email: 'user@example.com' });
 *
 * // Track revenue
 * trackRevenue('purchase', 99.99, 'USD');
 * ```
 */
export function useEntrolytics(): EntrolyticsContextValue {
  const context = useContext(EntrolyticsContext);

  if (!context) {
    throw new Error('useEntrolytics must be used within an EntrolyticsProvider');
  }

  return context;
}
