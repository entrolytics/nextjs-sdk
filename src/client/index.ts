export { Analytics, OutboundLink, Script, TrackEvent } from './components';
export { EntrolyticsContext } from './context';
export {
  useEntrolytics,
  useEventTracker,
  usePageView,
  // Phase 2
  useWebVitals,
  useFormTracking,
} from './hooks';
export { EntrolyticsProvider } from './provider';

// Re-export Phase 2 types
export type {
  WebVitalMetric,
  WebVitalRating,
  NavigationType,
  WebVitalData,
  UseWebVitalsOptions,
  FormEventType,
  FormEventData,
  UseFormTrackingOptions,
} from './hooks';
