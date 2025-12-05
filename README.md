# @entrolytics/nextjs

Official Next.js integration for Entrolytics analytics. Built for the App Router with full TypeScript support.

## Features

- **App Router Native** - Built specifically for Next.js 13+ App Router
- **SSR Safe** - No hydration mismatches, proper server/client separation
- **Auto Page Tracking** - Automatic page view tracking with route detection
- **Event Tracking** - Track custom events with typed data
- **User Identification** - Identify users across sessions
- **Revenue Tracking** - Track purchases and conversions
- **Outbound Links** - Automatic external link tracking
- **A/B Testing** - Tag-based segmentation for experiments
- **Ad-Blocker Bypass** - Proxy mode for reliable tracking
- **Server-Side Tracking** - Track from API routes and Server Actions

## Installation

```bash
pnpm add @entrolytics/nextjs
```

## Quick Start

### 1. Add Analytics Component

```tsx
// app/layout.tsx
import { Analytics } from '@entrolytics/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

That's it! The `<Analytics />` component automatically reads from your `.env.local`:

```bash
NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID=your-website-id
NEXT_PUBLIC_ENTROLYTICS_HOST=https://ng.entrolytics.click
```

### 2. Track Events

```tsx
'use client';

import { useEntrolytics } from '@entrolytics/nextjs';

export function SignupButton() {
  const { track } = useEntrolytics();

  return (
    <button onClick={() => track('signup-click', { plan: 'premium' })}>
      Sign Up
    </button>
  );
}
```

## Configuration

### Simple Configuration (Recommended)

Use the `<Analytics />` component with props:

```tsx
<Analytics
  debug={true}
  autoTrack={true}
  trackOutboundLinks={true}
/>
```

All configuration options are optional - the component reads `websiteId` and `host` from environment variables.

### Advanced Configuration

For more control, use `<EntrolyticsProvider>` directly:

```tsx
import { EntrolyticsProvider } from '@entrolytics/nextjs';

<EntrolyticsProvider
  websiteId="your-website-id"           // Required
  host="https://analytics.example.com"  // Optional: custom host
  autoTrack={true}                      // Auto page views (default: true)
  useEdgeRuntime={true}                 // Use edge endpoints (default: true)
  tag="production"                      // A/B testing tag
  domains={['example.com']}             // Restrict to domains
  excludeSearch={false}                 // Strip query params
  excludeHash={true}                    // Strip hash fragments
  respectDoNotTrack={false}             // Honor DNT header
  ignoreLocalhost={true}                // Skip localhost
  trackOutboundLinks={true}             // Track external links
  debug={false}                         // Console logging
  beforeSend={(type, payload) => {      // Transform/filter
    if (isAdmin) return null;
    return payload;
  }}
>
  {children}
</EntrolyticsProvider>
```

### Runtime Configuration

The `useEdgeRuntime` prop controls which collection endpoint is used:

**Edge Runtime (default)** - Optimized for speed:
```tsx
<EntrolyticsProvider
  websiteId="your-website-id"
  useEdgeRuntime={true} // or omit (default)
>
  {children}
</EntrolyticsProvider>
```

- **Latency**: 50-100ms via edge proxy to Node.js backend
- **Best for**: Most production applications
- **Endpoint**: Uses `/api/send-edge` (edge proxy with global distribution)

**Node.js Runtime** - Direct backend connection:
```tsx
<EntrolyticsProvider
  websiteId="your-website-id"
  useEdgeRuntime={false}
>
  {children}
</EntrolyticsProvider>
```

- **Features**: Direct Node.js connection, ClickHouse export, MaxMind GeoIP
- **Best for**: Self-hosted deployments, custom backend configurations
- **Endpoint**: Uses `/api/send` (Node.js runtime)
- **Latency**: 50-150ms (regional)

**When to use Node.js runtime**:
- Self-hosted deployments without edge runtime
- Custom backend configurations
- Testing/development environments

See the [Intelligent Routing](/docs/concepts/routing) guide for more details on collection endpoints.

## Hooks

### useEntrolytics

```tsx
const {
  track,              // Track events
  trackView,          // Manual page view
  identify,           // User identification
  trackRevenue,       // Revenue tracking
  trackOutboundLink,  // Outbound link tracking
  setTag,             // Change A/B test tag
  generateEnhancedIdentity,  // Browser metadata
  isReady,            // Tracker ready state
  isEnabled,          // Tracking enabled state
} = useEntrolytics();
```

### usePageView

```tsx
// Basic - tracks on mount
usePageView();

// Custom URL
usePageView({ url: '/virtual-page' });

// With dependencies
usePageView({ url: dynamicPath, deps: [dynamicPath] });

// Conditional
usePageView({ enabled: isAuthenticated });
```

### useEventTracker

```tsx
const { trackEvent, createClickHandler } = useEventTracker({
  eventName: 'button-click',
  defaultData: { section: 'header' },
});

// Track with defaults
trackEvent();

// Use as click handler
<button onClick={createClickHandler('cta-click')}>Click</button>
```

## Components

### TrackEvent

```tsx
// Track on click
<TrackEvent name="cta-click" data={{ location: 'hero' }}>
  <button>Get Started</button>
</TrackEvent>

// Track on visibility
<TrackEvent name="section-viewed" trigger="visible" once>
  <section>Pricing</section>
</TrackEvent>

// Track on form submit
<TrackEvent name="form-submit" trigger="submit">
  <form>...</form>
</TrackEvent>
```

### OutboundLink

```tsx
<OutboundLink href="https://github.com" data={{ context: 'footer' }}>
  GitHub
</OutboundLink>
```

## Server-Side Tracking

### API Routes / Server Actions

```ts
import { trackServerEvent } from '@entrolytics/nextjs/server';

export async function POST(request: Request) {
  await trackServerEvent(
    {
      host: process.env.ENTROLYTICS_HOST!,
      websiteId: process.env.ENTROLYTICS_NG_WEBSITE_ID!,
    },
    {
      event: 'api-call',
      data: { endpoint: '/api/users' },
      request,
    }
  );

  return Response.json({ success: true });
}
```

### Proxy Mode

```ts
// app/api/collect/[...path]/route.ts
import { createProxyHandler } from '@entrolytics/nextjs/server';

export const { GET, POST } = createProxyHandler({
  host: process.env.ENTROLYTICS_HOST!,
  websiteId: process.env.ENTROLYTICS_NG_WEBSITE_ID,
  mode: 'cloak',
});
```

### Middleware

```ts
// middleware.ts
import { withEntrolyticsMiddleware } from '@entrolytics/nextjs/server';

const entrolytics = withEntrolyticsMiddleware({
  host: process.env.ENTROLYTICS_HOST!,
  websiteId: process.env.ENTROLYTICS_NG_WEBSITE_ID!,
  trackRoutes: ['/api/*'],
});

export async function middleware(request: NextRequest) {
  return entrolytics(request);
}
```

## Next.js Config Plugin

```ts
// next.config.ts
import { withEntrolytics } from '@entrolytics/nextjs/plugin';

export default withEntrolytics({
  websiteId: process.env.NEXT_PUBLIC_ENTROLYTICS_NG_WEBSITE_ID!,
  host: process.env.NEXT_PUBLIC_ENTROLYTICS_HOST,
  proxy: {
    enabled: true,
    mode: 'cloak',
  },
})({
  reactStrictMode: true,
});
```

## License

MIT © [Entrolytics](https://ng.entrolytics.click)
