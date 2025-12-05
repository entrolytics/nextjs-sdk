'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useEntrolytics } from './useEntrolytics';

export type FormEventType =
  | 'start'
  | 'field_focus'
  | 'field_blur'
  | 'field_error'
  | 'submit'
  | 'abandon';

export interface FormEventData {
  eventType: FormEventType;
  formId: string;
  formName?: string;
  urlPath?: string;
  fieldName?: string;
  fieldType?: string;
  fieldIndex?: number;
  timeOnField?: number;
  timeSinceStart?: number;
  errorMessage?: string;
  success?: boolean;
}

export interface UseFormTrackingOptions {
  formId: string;
  formName?: string;
  autoTrack?: boolean;
  trackTiming?: boolean;
  trackAbandonment?: boolean;
}

interface FormState {
  startTime: number | null;
  fieldStartTimes: Map<string, number>;
  hasInteracted: boolean;
  lastFieldName: string | null;
}

/**
 * Hook for tracking form interactions in Next.js
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useFormTracking } from '@entrolytics/nextjs';
 *
 * export function ContactForm() {
 *   const { formRef, trackSubmit } = useFormTracking({
 *     formId: 'contact-form',
 *     formName: 'Contact Form'
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     const success = await submitForm();
 *     trackSubmit(success);
 *   };
 *
 *   return (
 *     <form ref={formRef} onSubmit={handleSubmit}>
 *       <input name="email" type="email" />
 *       <button type="submit">Send</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useFormTracking(options: UseFormTrackingOptions) {
  const { formId, formName, autoTrack = true, trackTiming = true, trackAbandonment = true } = options;
  const { config } = useEntrolytics();
  const formRef = useRef<HTMLFormElement | null>(null);
  const stateRef = useRef<FormState>({
    startTime: null,
    fieldStartTimes: new Map(),
    hasInteracted: false,
    lastFieldName: null,
  });

  const trackEvent = useCallback(
    async (data: Omit<FormEventData, 'formId' | 'formName' | 'urlPath'> & Partial<Pick<FormEventData, 'formId' | 'formName' | 'urlPath'>>) => {
      if (typeof window === 'undefined') return;

      const host = config.host || 'https://ng.entrolytics.click';
      const payload: FormEventData = {
        formId: data.formId || formId,
        formName: data.formName || formName,
        urlPath: data.urlPath || window.location.pathname,
        ...data,
      };

      try {
        await fetch(`${host}/api/collect/forms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website: config.websiteId,
            ...payload,
          }),
          keepalive: true,
        });
      } catch (err) {
        console.error('[Entrolytics] Failed to track form event:', err);
      }
    },
    [config.websiteId, config.host, formId, formName],
  );

  const trackStart = useCallback(() => {
    if (stateRef.current.startTime !== null) return;
    stateRef.current.startTime = Date.now();
    trackEvent({ eventType: 'start' });
  }, [trackEvent]);

  const trackFieldFocus = useCallback(
    (fieldName: string, fieldType?: string, fieldIndex?: number) => {
      const state = stateRef.current;

      if (!state.hasInteracted) {
        state.hasInteracted = true;
        trackStart();
      }

      if (trackTiming) {
        state.fieldStartTimes.set(fieldName, Date.now());
      }

      state.lastFieldName = fieldName;

      trackEvent({
        eventType: 'field_focus',
        fieldName,
        fieldType,
        fieldIndex,
        timeSinceStart: state.startTime ? Date.now() - state.startTime : undefined,
      });
    },
    [trackEvent, trackStart, trackTiming],
  );

  const trackFieldBlur = useCallback(
    (fieldName: string, fieldType?: string, fieldIndex?: number) => {
      const state = stateRef.current;
      const fieldStartTime = state.fieldStartTimes.get(fieldName);
      const timeOnField = fieldStartTime ? Date.now() - fieldStartTime : undefined;

      trackEvent({
        eventType: 'field_blur',
        fieldName,
        fieldType,
        fieldIndex,
        timeOnField,
        timeSinceStart: state.startTime ? Date.now() - state.startTime : undefined,
      });
    },
    [trackEvent],
  );

  const trackFieldError = useCallback(
    (fieldName: string, errorMessage: string, fieldType?: string, fieldIndex?: number) => {
      trackEvent({
        eventType: 'field_error',
        fieldName,
        fieldType,
        fieldIndex,
        errorMessage,
        timeSinceStart: stateRef.current.startTime
          ? Date.now() - stateRef.current.startTime
          : undefined,
      });
    },
    [trackEvent],
  );

  const trackSubmit = useCallback(
    (success: boolean) => {
      trackEvent({
        eventType: 'submit',
        success,
        timeSinceStart: stateRef.current.startTime
          ? Date.now() - stateRef.current.startTime
          : undefined,
      });

      stateRef.current = {
        startTime: null,
        fieldStartTimes: new Map(),
        hasInteracted: false,
        lastFieldName: null,
      };
    },
    [trackEvent],
  );

  const trackAbandon = useCallback(() => {
    if (!stateRef.current.hasInteracted) return;

    trackEvent({
      eventType: 'abandon',
      fieldName: stateRef.current.lastFieldName || undefined,
      timeSinceStart: stateRef.current.startTime
        ? Date.now() - stateRef.current.startTime
        : undefined,
    });
  }, [trackEvent]);

  useEffect(() => {
    if (!autoTrack || !formRef.current) return;

    const form = formRef.current;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!target.name && !target.id) return;

      const fieldName = target.name || target.id;
      const fieldType = target.type || target.tagName.toLowerCase();
      const fields = Array.from(form.elements);
      const fieldIndex = fields.indexOf(target);

      trackFieldFocus(fieldName, fieldType, fieldIndex >= 0 ? fieldIndex : undefined);
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!target.name && !target.id) return;

      const fieldName = target.name || target.id;
      const fieldType = target.type || target.tagName.toLowerCase();
      const fields = Array.from(form.elements);
      const fieldIndex = fields.indexOf(target);

      trackFieldBlur(fieldName, fieldType, fieldIndex >= 0 ? fieldIndex : undefined);
    };

    form.addEventListener('focusin', handleFocus);
    form.addEventListener('focusout', handleBlur);

    return () => {
      form.removeEventListener('focusin', handleFocus);
      form.removeEventListener('focusout', handleBlur);
    };
  }, [autoTrack, trackFieldFocus, trackFieldBlur]);

  useEffect(() => {
    if (!trackAbandonment) return;

    const handleBeforeUnload = () => {
      if (stateRef.current.hasInteracted && stateRef.current.startTime) {
        trackAbandon();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackAbandonment, trackAbandon]);

  return {
    formRef,
    trackEvent,
    trackStart,
    trackFieldFocus,
    trackFieldBlur,
    trackFieldError,
    trackSubmit,
    trackAbandon,
  };
}
