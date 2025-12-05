'use client';

import { type Ref, useCallback } from 'react';
import type { OutboundLinkProps } from '../../types';
import { useEntrolytics } from '../hooks/useEntrolytics';

/**
 * Component for tracking outbound link clicks.
 * Uses React 19's ref as prop pattern for better compatibility.
 *
 * @example
 * ```tsx
 * <OutboundLink href="https://stripe.com" data={{ context: 'pricing' }}>
 *   Payment Provider
 * </OutboundLink>
 *
 * <OutboundLink href="https://github.com/entro314-labs" target="_blank">
 *   View on GitHub
 * </OutboundLink>
 * ```
 */
export function OutboundLink({
  href,
  data,
  children,
  onClick,
  ref,
  ...props
}: OutboundLinkProps & { ref?: Ref<HTMLAnchorElement> }) {
  const { trackOutboundLink, isReady, config } = useEntrolytics();

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isReady) {
        const isExternal =
          props.target === '_blank' ||
          e.ctrlKey ||
          e.shiftKey ||
          e.metaKey ||
          (e.button && e.button === 1);

        // For internal navigation, prevent default and track first
        if (!isExternal) {
          e.preventDefault();
          await trackOutboundLink(href, data);
          // Navigate after tracking
          if (props.target === '_top' && window.top) {
            window.top.location.href = href;
          } else {
            window.location.href = href;
          }
        } else {
          // For external/new tab, track without blocking
          trackOutboundLink(href, data);
        }
      }

      onClick?.(e);
    },
    [isReady, trackOutboundLink, href, data, onClick, props.target],
  );

  return (
    <a
      ref={ref}
      href={href}
      onClick={handleClick}
      data-entrolytics-event={config.outboundLinkEvent}
      data-entrolytics-event-url={href}
      {...props}
    >
      {children}
    </a>
  );
}
