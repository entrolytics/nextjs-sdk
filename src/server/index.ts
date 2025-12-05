// Core exports
export { composeMiddleware, withEntrolyticsMiddleware } from './middleware';
export { createProxyHandler, createScriptProxy } from './proxy';
export { identifyServerSession, trackServerEvent } from './track';

// Phase 2: Deployment detection
export type { DeploymentInfo } from './deployment';
export { detectDeployment, getDeploymentLabel } from './deployment';

// Phase 2: Web Vitals
export type {
  WebVitalMetric,
  WebVitalRating,
  NavigationType,
  WebVitalPayload,
  TrackVitalsConfig,
} from './vitals';
export {
  trackServerVital,
  trackServerVitalsBatch,
  createWebVitalsReporter,
} from './vitals';

// Phase 2: Form tracking
export type {
  FormEventType,
  FormEventPayload,
  TrackFormConfig,
} from './forms';
export {
  trackServerFormEvent,
  trackServerFormEventsBatch,
  withFormTracking,
} from './forms';
