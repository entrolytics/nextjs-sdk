'use client';

import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  EnhancedIdentityData,
  EntrolyticsConfig,
  EntrolyticsContextValue,
  EventData,
  EventPayload,
  IdentifyPayload,
  PayloadType,
  TrackedProperties,
} from '../types';
import { EntrolyticsContext } from './context';

declare global {
  interface Window {
    entrolytics?: {
      track: EntrolyticsContextValue['track'];
      identify: EntrolyticsContextValue['identify'];
    };
  }
}

interface EntrolyticsProviderProps extends EntrolyticsConfig {
  children: ReactNode;
}

const SESSION_KEY = '__entro_sid';
const VISITOR_KEY = '__entro_vid';

function generateUuid(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateUuid();

  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const sessionId = generateUuid();
  window.sessionStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return generateUuid();

  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const visitorId = generateUuid();
  window.localStorage.setItem(VISITOR_KEY, visitorId);
  return visitorId;
}

export function EntrolyticsProvider({
  children,
  websiteId,
  apiKey,
  linkId: _linkId,
  pixelId: _pixelId,
  host,
  autoTrack = true,
  tag: initialTag,
  domains,
  excludeSearch = false,
  excludeHash = false,
  respectDoNotTrack = false,
  ignoreLocalhost = false,
  beforeSend,
  trackOutboundLinks = false,
  outboundLinkEvent = 'outbound-link-click',
  proxy = false,
  scriptName = 'script.js',
  debug = false,
  useEdgeRuntime = true,
}: EntrolyticsProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [currentTag, setCurrentTag] = useState(initialTag);
  const [identity, setIdentity] = useState<string | undefined>();
  const cacheRef = useRef<string | undefined>(undefined);
  const currentUrlRef = useRef<string>('');
  const currentRefRef = useRef<string>('');
  const missingApiKeyWarned = useRef(false);

  // Determine endpoint
  const endpoint = useMemo(() => {
    if (proxy && typeof proxy === 'object' && proxy.enabled) {
      return proxy.collectPath || '/api/collect';
    }

    const endpointPath = '/collect';

    if (host) {
      return `${host.replace(/\/$/, '')}${endpointPath}`;
    }
    return endpointPath;
  }, [host, proxy]);

  // Check if tracking should be disabled
  const checkTrackingDisabled = useCallback((): boolean => {
    if (typeof window === 'undefined') return true;
    if (!websiteId) return true;
    if (!isEnabled) return true;

    // Check localStorage disable flag
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem('entrolytics.disabled')) return true;
    }

    // Check domain restrictions
    if (domains && domains.length > 0) {
      if (!domains.includes(window.location.hostname)) return true;
    }

    // Check localhost
    if (ignoreLocalhost) {
      const { hostname } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    }

    // Check Do Not Track
    if (respectDoNotTrack) {
      const dnt =
        (navigator as Navigator & { doNotTrack?: string }).doNotTrack ||
        (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack ||
        (window as Window & { doNotTrack?: string }).doNotTrack;
      if (dnt === '1' || dnt === 'yes') return true;
    }

    return false;
  }, [websiteId, isEnabled, domains, ignoreLocalhost, respectDoNotTrack]);

  // Get current payload
  const getPayload = useCallback((): TrackedProperties => {
    const { screen, navigator, location, document } = window;

    const payload: TrackedProperties = {
      hostname: location.hostname,
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language,
      title: document.title,
      url: currentUrlRef.current || location.pathname + location.search + location.hash,
      referrer: currentRefRef.current,
      tag: currentTag,
      id: identity,
    };

    if (websiteId) payload.website = websiteId;

    return payload;
  }, [websiteId, currentTag, identity]);

  // Debug logger
  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        console.log('[Entrolytics]', ...args);
      }
    },
    [debug],
  );

  const toAbsoluteUrl = useCallback((rawUrl: string): string => {
    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }

    if (typeof window === 'undefined') {
      const normalized = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
      return `https://localhost${normalized}`;
    }

    try {
      return new URL(rawUrl, window.location.origin).toString();
    } catch {
      return window.location.href;
    }
  }, []);

  const toValidReferrer = useCallback((rawReferrer?: string): string | undefined => {
    if (!rawReferrer) return undefined;
    if (/^https?:\/\//i.test(rawReferrer)) {
      return rawReferrer;
    }
    return undefined;
  }, []);

  // Send data to endpoint
  const send = useCallback(
    async (payload: EventPayload | IdentifyPayload, type: PayloadType = 'event'): Promise<void> => {
      if (checkTrackingDisabled()) {
        log('Tracking disabled, skipping', type);
        return;
      }

      if (!websiteId) {
        log('websiteId is required for collect tracking, skipping');
        return;
      }

      if (!apiKey) {
        if (!missingApiKeyWarned.current) {
          log('apiKey is required for collect tracking, skipping until configured');
          missingApiKeyWarned.current = true;
        }
        return;
      }

      let finalPayload = payload;

      // Apply beforeSend callback
      if (beforeSend) {
        const result = beforeSend(type, payload);
        if (!result) {
          log('beforeSend returned falsy, skipping', type);
          return;
        }
        finalPayload = result;
      }

      log('Sending', type, finalPayload);

      try {
        const eventPayload = finalPayload as Partial<EventPayload> & Partial<TrackedProperties>;
        const rawUrl =
          typeof eventPayload.url === 'string' && eventPayload.url.length > 0
            ? eventPayload.url
            : currentUrlRef.current || window.location.pathname + window.location.search;

        const url = toAbsoluteUrl(rawUrl);
        const sessionId = getOrCreateSessionId();
        const visitorId = getOrCreateVisitorId();

        const properties: Record<string, unknown> = {
          ...(eventPayload.data && typeof eventPayload.data === 'object' ? eventPayload.data : {}),
        };

        if (eventPayload.tag) properties.tag = eventPayload.tag;
        if (eventPayload.id) properties.distinctId = eventPayload.id;

        if (type === 'identify') {
          properties.identify = true;
        }

        const eventName =
          typeof eventPayload.name === 'string' && eventPayload.name.length > 0
            ? eventPayload.name
            : type === 'identify'
              ? 'identify'
              : undefined;

        const eventType = eventName ? 'custom_event' : 'pageview';
        const parsedUrl = new URL(url);
        const normalizedReferrer = toValidReferrer(eventPayload.referrer);

        const collectPayload = {
          websiteId,
          sessionId,
          visitorId,
          url,
          eventType,
          ...(eventName && { eventName }),
          ...(normalizedReferrer && { referrer: normalizedReferrer }),
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          ...(parsedUrl.searchParams.get('utm_source') && {
            utmSource: parsedUrl.searchParams.get('utm_source'),
          }),
          ...(parsedUrl.searchParams.get('utm_medium') && {
            utmMedium: parsedUrl.searchParams.get('utm_medium'),
          }),
          ...(parsedUrl.searchParams.get('utm_campaign') && {
            utmCampaign: parsedUrl.searchParams.get('utm_campaign'),
          }),
          ...(parsedUrl.searchParams.get('utm_term') && {
            utmTerm: parsedUrl.searchParams.get('utm_term'),
          }),
          ...(parsedUrl.searchParams.get('utm_content') && {
            utmContent: parsedUrl.searchParams.get('utm_content'),
          }),
          ...(Object.keys(properties).length > 0 && { properties }),
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          body: JSON.stringify(collectPayload),
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            ...(cacheRef.current && { 'x-entrolytics-cache': cacheRef.current }),
          },
          credentials: 'omit',
          keepalive: true,
        });

        const responseText = await res.text();
        if (responseText) {
          try {
            const data = JSON.parse(responseText) as { cache?: string; disabled?: boolean };
            if (data.disabled) setIsEnabled(false);
            if (data.cache) cacheRef.current = data.cache;
          } catch {
            // Non-JSON response is acceptable for fire-and-forget endpoint
          }
        }
      } catch (error) {
        log('Error sending', type, error);
      }
    },
    [
      apiKey,
      endpoint,
      checkTrackingDisabled,
      beforeSend,
      log,
      websiteId,
      toAbsoluteUrl,
      toValidReferrer,
    ],
  );

  // Track function with multiple overloads
  const track = useCallback(
    async (
      nameOrPayloadOrFn?:
        | string
        | Partial<EventPayload>
        | ((props: TrackedProperties) => EventPayload),
      data?: EventData,
    ): Promise<void> => {
      const basePayload = getPayload();

      if (typeof nameOrPayloadOrFn === 'function') {
        return send(nameOrPayloadOrFn(basePayload));
      }

      if (typeof nameOrPayloadOrFn === 'object') {
        return send({ ...basePayload, ...nameOrPayloadOrFn });
      }

      if (typeof nameOrPayloadOrFn === 'string') {
        return send({ ...basePayload, name: nameOrPayloadOrFn, data });
      }

      return send(basePayload);
    },
    [getPayload, send],
  ) as EntrolyticsContextValue['track'];

  // Track page view
  const trackView = useCallback(
    async (url?: string, referrer?: string): Promise<void> => {
      const payload = getPayload();
      if (url) payload.url = url;
      if (referrer) payload.referrer = referrer;
      return send(payload);
    },
    [getPayload, send],
  );

  // Identify function
  const identify = useCallback(
    async (idOrData?: string | EventData, data?: EventData): Promise<void> => {
      const payload = getPayload();

      if (typeof idOrData === 'string') {
        setIdentity(idOrData);
        payload.id = idOrData;
        cacheRef.current = undefined; // Reset cache on identify
        return send({ ...payload, data }, 'identify');
      }

      if (typeof idOrData === 'object') {
        return send({ ...payload, data: idOrData }, 'identify');
      }

      return send(payload, 'identify');
    },
    [getPayload, send],
  ) as EntrolyticsContextValue['identify'];

  // Track revenue
  const trackRevenue = useCallback(
    async (eventName: string, revenue: number, currency = 'USD'): Promise<void> => {
      if (!Number.isFinite(revenue)) {
        log('Invalid revenue amount', revenue);
        return;
      }

      const payload = getPayload();
      return send({
        ...payload,
        name: eventName,
        data: {
          revenue,
          currency: currency.toUpperCase().slice(0, 3),
        },
      });
    },
    [getPayload, send, log],
  );

  // Track outbound link
  const trackOutboundLink = useCallback(
    async (url: string, data?: EventData): Promise<void> => {
      const payload = getPayload();
      return send({
        ...payload,
        name: outboundLinkEvent,
        data: {
          ...data,
          url,
        },
      });
    },
    [getPayload, send, outboundLinkEvent],
  );

  // Set tag
  const setTag = useCallback((tag: string) => {
    setCurrentTag(tag);
  }, []);

  // Generate enhanced identity data
  const generateEnhancedIdentity = useCallback(
    (data?: Record<string, string | number | boolean | undefined>): EnhancedIdentityData => {
      if (typeof window === 'undefined') return { ...data } as EnhancedIdentityData;

      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } })
        .connection;

      return {
        ...data,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        connectionType: connection?.effectiveType,
        touchCapable: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        orientation: screen.orientation?.type,
        devicePixelRatio: window.devicePixelRatio,
        platform: navigator.platform,
      };
    },
    [],
  );

  // Initialize URL tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { location, document } = window;
    let url = location.pathname + location.search + location.hash;

    if (excludeSearch) {
      const urlObj = new URL(url, location.origin);
      urlObj.search = '';
      url = urlObj.pathname + urlObj.hash;
    }

    if (excludeHash) {
      const urlObj = new URL(url, location.origin);
      urlObj.hash = '';
      url = urlObj.pathname + urlObj.search;
    }

    currentUrlRef.current = url;
    currentRefRef.current = document.referrer.startsWith(location.origin) ? '' : document.referrer;

    setIsReady(true);
  }, [excludeSearch, excludeHash]);

  // Auto-track initial page view
  useEffect(() => {
    if (!isReady || !autoTrack || checkTrackingDisabled()) return;
    void track();
  }, [isReady, autoTrack, checkTrackingDisabled, track]);

  // Handle history changes for SPA navigation
  useEffect(() => {
    if (typeof window === 'undefined' || !autoTrack) return;

    const handleNavigation = () => {
      const { location } = window;
      const previousUrl = currentUrlRef.current;

      let url = location.pathname + location.search + location.hash;

      if (excludeSearch) {
        const urlObj = new URL(url, location.origin);
        urlObj.search = '';
        url = urlObj.pathname + urlObj.hash;
      }

      if (excludeHash) {
        const urlObj = new URL(url, location.origin);
        urlObj.hash = '';
        url = urlObj.pathname + urlObj.search;
      }

      if (url !== previousUrl) {
        currentRefRef.current = previousUrl;
        currentUrlRef.current = url;
        // Small delay to ensure page title updates
        setTimeout(() => track(), 300);
      }
    };

    // Hook into history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleNavigation();
    };

    window.addEventListener('popstate', handleNavigation);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [autoTrack, excludeSearch, excludeHash, track]);

  // Setup outbound link tracking
  useEffect(() => {
    if (!trackOutboundLinks || typeof window === 'undefined') return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as Element)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.host !== window.location.host) {
          void trackOutboundLink(href);
        }
      } catch {
        // Invalid URL, skip
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [trackOutboundLinks, trackOutboundLink]);

  // Expose global entrolytics object
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.entrolytics = {
      track,
      identify,
    };

    return () => {
      delete window.entrolytics;
    };
  }, [track, identify]);

  const config = useMemo(
    () => ({
      websiteId,
      apiKey,
      host,
      autoTrack,
      tag: currentTag,
      domains,
      excludeSearch,
      excludeHash,
      respectDoNotTrack,
      ignoreLocalhost,
      beforeSend,
      trackOutboundLinks,
      outboundLinkEvent,
      proxy,
      scriptName,
      debug,
      useEdgeRuntime,
    }),
    [
      websiteId,
      apiKey,
      host,
      autoTrack,
      currentTag,
      domains,
      excludeSearch,
      excludeHash,
      respectDoNotTrack,
      ignoreLocalhost,
      beforeSend,
      trackOutboundLinks,
      outboundLinkEvent,
      proxy,
      scriptName,
      debug,
      useEdgeRuntime,
    ],
  );

  const value = useMemo<EntrolyticsContextValue>(
    () => ({
      track,
      trackView,
      identify,
      trackRevenue,
      trackOutboundLink,
      setTag,
      generateEnhancedIdentity,
      isReady,
      isEnabled,
      config,
    }),
    [
      track,
      trackView,
      identify,
      trackRevenue,
      trackOutboundLink,
      setTag,
      generateEnhancedIdentity,
      isReady,
      isEnabled,
      config,
    ],
  );

  return <EntrolyticsContext.Provider value={value}>{children}</EntrolyticsContext.Provider>;
}
