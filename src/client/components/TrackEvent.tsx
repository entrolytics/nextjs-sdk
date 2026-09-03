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

interface TrackedChildProps {
  onClick?: (event: React.MouseEvent) => void;
  onSubmit?: (event: React.FormEvent) => void;
  ref?: React.Ref<HTMLElement>;
  className?: string;
}

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
  const setElementRef = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

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
    if (trigger !== 'visible' || !isReady) return undefined;

    const element = elementRef.current;
    if (!element) return undefined;

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
  if (isValidElement<TrackedChildProps>(children)) {
    const child: ReactElement<TrackedChildProps> = children;

    const props: TrackedChildProps = {
      ref: setElementRef,
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
        ref={setElementRef}
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
    <span ref={setElementRef} className={className}>
      {children}
    </span>
  );
}
