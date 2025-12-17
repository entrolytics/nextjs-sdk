// Client-side exports (default)

// Re-export Phase 2 types from client
export type {
  FormEventData,
  FormEventType,
  NavigationType,
  UseFormTrackingOptions,
  UseWebVitalsOptions,
  WebVitalData,
  WebVitalMetric,
  WebVitalRating,
} from './client';
export {
  Analytics,
  EntrolyticsContext,
  EntrolyticsProvider,
  OutboundLink,
  Script,
  TrackEvent,
  useEntrolytics,
  useEventTracker,
  useFormTracking,
  usePageView,
  // Phase 2
  useWebVitals,
} from './client';

// Re-export Analytics props type
export type { AnalyticsProps } from './client/components/Analytics';
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
