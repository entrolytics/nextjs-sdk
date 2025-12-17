// Core exports

// Phase 2: Deployment detection
export type { DeploymentInfo } from './deployment';
export { detectDeployment, getDeploymentLabel } from './deployment';
// Phase 2: Form tracking
export type {
  FormEventPayload,
  FormEventType,
  TrackFormConfig,
} from './forms';
export {
  trackServerFormEvent,
  trackServerFormEventsBatch,
  withFormTracking,
} from './forms';
export { composeMiddleware, withEntrolyticsMiddleware } from './middleware';
export { createProxyHandler, createScriptProxy } from './proxy';
export { identifyServerSession, trackServerEvent } from './track';
// Phase 2: Web Vitals
export type {
  NavigationType,
  TrackVitalsConfig,
  WebVitalMetric,
  WebVitalPayload,
  WebVitalRating,
} from './vitals';
export {
  createWebVitalsReporter,
  trackServerVital,
  trackServerVitalsBatch,
} from './vitals';
