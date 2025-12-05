/**
 * Event data can work with any JSON data. There are a few rules in place to maintain performance.
 * - Numbers have a max precision of 4.
 * - Strings have a max length of 500.
 * - Arrays are converted to a String, with the same max length of 500.
 * - Objects have a max of 50 properties. Arrays are considered 1 property.
 */
export interface EventData {
  [key: string]: string | number | boolean | EventData | string[] | number[] | EventData[];
}

export interface TrackedProperties {
  /** Hostname of server */
  hostname: string;
  /** Browser language */
  language: string;
  /** Page referrer */
  referrer: string;
  /** Screen dimensions (e.g., '1920x1080') */
  screen: string;
  /** Page title */
  title: string;
  /** Page URL */
  url: string;
  /** Website ID (or use link/pixel) */
  website?: string;
  /** Link ID (alternative to website) */
  link?: string;
  /** Pixel ID (alternative to website) */
  pixel?: string;
  /** Optional tag for A/B testing */
  tag?: string;
  /** Optional distinct ID for user tracking */
  id?: string;
}

export interface EventPayload extends TrackedProperties {
  /** Event name (max 50 characters) */
  name?: string;
  /** Event data */
  data?: EventData;
}

export interface IdentifyPayload extends TrackedProperties {
  /** Session/user data */
  data?: EventData;
}

export interface RevenuePayload extends EventPayload {
  /** Revenue amount */
  revenue: number;
  /** ISO 4217 currency code (default: USD) */
  currency?: string;
}

export type PayloadType = 'event' | 'identify';

export type BeforeSendCallback = (
  type: PayloadType,
  payload: EventPayload | IdentifyPayload,
) => EventPayload | IdentifyPayload | null | undefined;

export interface EntrolyticsConfig {
  /** Your Entrolytics website ID (required - use one of: websiteId, linkId, or pixelId) */
  websiteId?: string;
  /** Your Entrolytics link ID for link tracking */
  linkId?: string;
  /** Your Entrolytics pixel ID for conversion tracking */
  pixelId?: string;
  /** Custom analytics host URL */
  host?: string;
  /** Automatically track page views (default: true) */
  autoTrack?: boolean;
  /** Tag for A/B testing and segmentation */
  tag?: string;
  /** Restrict tracking to specific domains */
  domains?: string[];
  /** Strip query parameters from URLs */
  excludeSearch?: boolean;
  /** Strip hash fragments from URLs */
  excludeHash?: boolean;
  /** Honor browser Do Not Track setting */
  respectDoNotTrack?: boolean;
  /** Disable tracking on localhost */
  ignoreLocalhost?: boolean;
  /** Transform or cancel events before sending */
  beforeSend?: BeforeSendCallback;
  /** Automatically track outbound link clicks */
  trackOutboundLinks?: boolean;
  /** Custom event name for outbound links (default: 'outbound-link-click') */
  outboundLinkEvent?: string;
  /** Proxy configuration for ad-blocker bypass */
  proxy?: ProxyConfig | false;
  /** Custom script name (default: 'script.js') */
  scriptName?: string;
  /** Enable debug mode with console logging */
  debug?: boolean;
  /** Use edge runtime endpoints for faster response times (default: true) */
  useEdgeRuntime?: boolean;
}

export interface ProxyConfig {
  /** Enable proxy mode */
  enabled: boolean;
  /** Custom path for the tracking script (default: '/analytics.js') */
  scriptPath?: string;
  /** Custom path for the collection endpoint (default: '/api/collect') */
  collectPath?: string;
  /** Proxy mode: 'direct' passes through, 'cloak' hides websiteId server-side */
  mode?: 'direct' | 'cloak';
}

export interface TrackOptions {
  /** Custom URL to track */
  url?: string;
  /** Custom referrer */
  referrer?: string;
  /** Custom title */
  title?: string;
}

export interface EnhancedIdentityData {
  /** User's timezone */
  timezone?: string;
  /** User's theme preference */
  theme?: string;
  /** Connection type (e.g., '4g', 'wifi') */
  connectionType?: string;
  /** Device has touch capability */
  touchCapable?: boolean;
  /** Screen orientation */
  orientation?: string;
  /** Device pixel ratio */
  devicePixelRatio?: number;
  /** Platform (e.g., 'MacIntel', 'Win32') */
  platform?: string;
  /** Additional custom data */
  [key: string]: string | number | boolean | undefined;
}

export interface UsePageViewOptions {
  /** Custom URL to track */
  url?: string;
  /** Custom referrer */
  referrer?: string;
  /** Dependencies that trigger re-tracking when changed */
  deps?: unknown[];
  /** Enable/disable tracking */
  enabled?: boolean;
}

export interface TrackEventProps {
  /** Event name */
  name: string;
  /** Event data */
  data?: EventData;
  /** Trigger type: 'click' (default), 'visible', 'submit' */
  trigger?: 'click' | 'visible' | 'submit';
  /** Only track once */
  once?: boolean;
  /** Children elements */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

export interface OutboundLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** External URL */
  href: string;
  /** Additional event data */
  data?: EventData;
  /** Children elements */
  children: React.ReactNode;
}

export interface EntrolyticsContextValue {
  /** Track an event or page view */
  track: {
    (): Promise<void>;
    (eventName: string): Promise<void>;
    (eventName: string, data: EventData): Promise<void>;
    (payload: Partial<EventPayload>): Promise<void>;
    (fn: (props: TrackedProperties) => EventPayload): Promise<void>;
  };
  /** Track a page view with optional custom URL */
  trackView: (url?: string, referrer?: string) => Promise<void>;
  /** Identify a user session */
  identify: {
    (data: EventData): Promise<void>;
    (uniqueId: string): Promise<void>;
    (uniqueId: string, data: EventData): Promise<void>;
  };
  /** Track revenue */
  trackRevenue: (eventName: string, revenue: number, currency?: string) => Promise<void>;
  /** Track outbound link click */
  trackOutboundLink: (url: string, data?: EventData) => Promise<void>;
  /** Set the current tag */
  setTag: (tag: string) => void;
  /** Generate enhanced identity data with browser metadata */
  generateEnhancedIdentity: (
    data?: Record<string, string | number | boolean | undefined>,
  ) => EnhancedIdentityData;
  /** Whether the tracker is ready */
  isReady: boolean;
  /** Whether tracking is enabled */
  isEnabled: boolean;
  /** Current configuration */
  config: EntrolyticsConfig;
}
