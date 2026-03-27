'use client';

import React from 'react';
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type { TrackEventProps } from '../../types';
import { useEntrolytics } from '../hooks/useEntrolytics';

/**
 * Declarative component for tracking events.
 *
 * @example
 * ```tsx
 * // Track on click (default)
 * <TrackEvent name="cta-click" data={{ location: 'hero' }}>
 *   <button>Get Started</button>
 * </TrackEvent>
 *
 * // Track on visibility (Intersection Observer)
 * <TrackEvent name="section-viewed" trigger="visible" once>
 *   <section>Pricing Content</section>
 * </TrackEvent>
 *
 * // Track on form submit
 * <TrackEvent name="form-submit" trigger="submit">
 *   <form>...</form>
 * </TrackEvent>
 * ```
 */
export function TrackEvent({
  name,
  data,
  trigger = 'click',
  once = false,
  children,
  className,
}: TrackEventProps) {
  const { track, isReady } = useEntrolytics();
  const elementRef = useRef<HTMLElement>(null);
  const hasTrackedRef = useRef(false);

  const handleTrack = useCallback(async () => {
    if (!isReady) return;
    if (once && hasTrackedRef.current) return;

    if (data) {
      await track(name, data);
    } else {
      await track(name);
    }
    hasTrackedRef.current = true;
  }, [isReady, once, track, name, data]);

  // Keyboard handler for accessible span wrapper
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (trigger === 'click' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        void handleTrack();
      }
    },
    [trigger, handleTrack],
  );

  // Handle visibility trigger with Intersection Observer
  useEffect(() => {
    if (trigger !== 'visible' || !isReady) return;

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            void handleTrack();
            if (once) {
              observer.disconnect();
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [trigger, isReady, handleTrack, once]);

  // Clone child element and attach handlers
  if (isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (e: React.MouseEvent) => void;
      onSubmit?: (e: React.FormEvent) => void;
      ref?: React.Ref<HTMLElement>;
      className?: string;
    }>;

    const props: Record<string, unknown> = {
      ref: elementRef,
    };

    if (className) {
      props.className = child.props.className ? `${child.props.className} ${className}` : className;
    }

    if (trigger === 'click') {
      props.onClick = async (e: React.MouseEvent) => {
        await handleTrack();
        child.props.onClick?.(e);
      };
    }

    if (trigger === 'submit') {
      props.onSubmit = async (e: React.FormEvent) => {
        await handleTrack();
        child.props.onSubmit?.(e);
      };
    }

    return cloneElement(child, props);
  }

  if (trigger === 'click') {
    return (
      <button
        ref={elementRef as React.RefObject<HTMLButtonElement>}
        type="button"
        className={className}
        onClick={() => {
          void handleTrack();
        }}
        onKeyDown={handleKeyDown}
      >
        {children}
      </button>
    );
  }

  return (
    <span ref={elementRef as React.RefObject<HTMLSpanElement>} className={className}>
      {children}
    </span>
  );
}
