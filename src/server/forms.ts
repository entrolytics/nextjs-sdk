/**
 * Server-side Form tracking for Next.js
 * Track form submissions from Server Actions and API routes
 */

export type FormEventType =
  | 'start'
  | 'field_focus'
  | 'field_blur'
  | 'field_error'
  | 'submit'
  | 'abandon';

export interface FormEventPayload {
  /** Form event type */
  eventType: FormEventType;
  /** Form identifier */
  formId: string;
  /** Human-readable form name */
  formName?: string;
  /** Page path where form exists */
  urlPath: string;
  /** Field name (for field events) */
  fieldName?: string;
  /** Field type */
  fieldType?: string;
  /** Field position */
  fieldIndex?: number;
  /** Time spent on field (ms) */
  timeOnField?: number;
  /** Time since form start (ms) */
  timeSinceStart?: number;
  /** Error message */
  errorMessage?: string;
  /** Whether submission was successful */
  success?: boolean;
}

export interface TrackFormConfig {
  /** Entrolytics host URL */
  host: string;
  /** Website ID */
  websiteId: string;
}

/**
 * Track a form event from server side (Server Actions, API routes)
 *
 * @example
 * ```ts
 * // In a Server Action
 * 'use server';
 * import { trackServerFormEvent } from '@entrolytics/nextjs/server';
 *
 * export async function submitContactForm(formData: FormData) {
 *   const result = await saveToDatabase(formData);
 *
 *   await trackServerFormEvent(
 *     {
 *       host: process.env.ENTROLYTICS_HOST!,
 *       websiteId: process.env.ENTROLYTICS_NG_WEBSITE_ID!,
 *     },
 *     {
 *       eventType: 'submit',
 *       formId: 'contact-form',
 *       formName: 'Contact Form',
 *       urlPath: '/contact',
 *       success: result.ok,
 *     }
 *   );
 *
 *   return result;
 * }
 * ```
 */
export async function trackServerFormEvent(
  config: TrackFormConfig,
  event: FormEventPayload,
): Promise<{ ok: boolean; error?: string }> {
  const { host, websiteId } = config;
  const baseUrl = host.replace(/\/$/, '');

  const payload = {
    website: websiteId,
    ...event,
  };

  try {
    const response = await fetch(`${baseUrl}/api/collect/forms`, {
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
 * Track multiple form events at once
 */
export async function trackServerFormEventsBatch(
  config: TrackFormConfig,
  events: FormEventPayload[],
): Promise<{ ok: boolean; error?: string }> {
  const { host, websiteId } = config;
  const baseUrl = host.replace(/\/$/, '');

  const payload = {
    website: websiteId,
    events,
  };

  try {
    const response = await fetch(`${baseUrl}/api/collect/forms`, {
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
 * Helper to create a form submission tracker
 * Wraps a Server Action to automatically track submit events
 *
 * @example
 * ```ts
 * 'use server';
 * import { withFormTracking } from '@entrolytics/nextjs/server';
 *
 * const trackedAction = withFormTracking(
 *   { host: '...', websiteId: '...' },
 *   { formId: 'signup', formName: 'Signup Form', urlPath: '/signup' }
 * );
 *
 * export async function signup(formData: FormData) {
 *   return trackedAction(async () => {
 *     const result = await createUser(formData);
 *     return { success: result.ok };
 *   });
 * }
 * ```
 */
export function withFormTracking(
  config: TrackFormConfig,
  formInfo: { formId: string; formName?: string; urlPath: string },
) {
  return async <T extends { success?: boolean }>(action: () => Promise<T>): Promise<T> => {
    const startTime = Date.now();

    try {
      const result = await action();

      await trackServerFormEvent(config, {
        eventType: 'submit',
        formId: formInfo.formId,
        formName: formInfo.formName,
        urlPath: formInfo.urlPath,
        success: result.success ?? true,
        timeSinceStart: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      await trackServerFormEvent(config, {
        eventType: 'submit',
        formId: formInfo.formId,
        formName: formInfo.formName,
        urlPath: formInfo.urlPath,
        success: false,
        timeSinceStart: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
}
