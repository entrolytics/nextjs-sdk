// Client-side exports (default)
export {
  Analytics,
  EntrolyticsContext,
  EntrolyticsProvider,
  OutboundLink,
  Script,
  TrackEvent,
  useEntrolytics,
  useEventTracker,
  usePageView,
  // Phase 2
  useWebVitals,
  useFormTracking,
} from './client';

// Type exports
export type {
  BeforeSendCallback,
  EnhancedIdentityData,
  EntrolyticsConfig,
  EntrolyticsContextValue,
  EventData,
  EventPayload,
  IdentifyPayload,
  OutboundLinkProps,
  PayloadType,
  ProxyConfig,
  TrackEventProps,
  TrackedProperties,
  TrackOptions,
  UsePageViewOptions,
} from './types';

// Re-export Analytics props type
export type { AnalyticsProps } from './client/components/Analytics';

// Re-export Phase 2 types from client
export type {
  WebVitalMetric,
  WebVitalRating,
  NavigationType,
  WebVitalData,
  UseWebVitalsOptions,
  FormEventType,
  FormEventData,
  UseFormTrackingOptions,
} from './client';
