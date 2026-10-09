export class LoggingAnalyticsHandler {
  trackPageView(url) {
    console.log('Analytics page view:', url); // eslint-disable-line no-console
  }
}

// Matches a canonical path (pathname + search, see util/routes.js canonicalRoutePath)
// against the handful of routes that make up the core conversion funnel, and
// returns the GA4 event to send for it, or null outside the funnel.
// ListingPage's canonical path already has its slug stripped to `/l/:id` by
// canonicalRoutePath, so it's distinguishable from CheckoutPage's
// `/l/:slug/:id/checkout` (slug kept, since that isn't the ListingPage route).
export const matchFunnelEvent = (canonicalPath, previousPath) => {
  const [path, query = ''] = canonicalPath.split('?');
  const params = new URLSearchParams(query);

  if (/^\/s(\/|$)/.test(path)) {
    const eventParams = {};
    if (params.get('keywords')) {
      eventParams.search_term = params.get('keywords');
    }
    if (params.get('pub_categoryLevel1')) {
      eventParams.category = params.get('pub_categoryLevel1');
    }
    return { name: 'search', params: eventParams };
  }
  if (/^\/l\/[^/]+$/.test(path)) {
    return { name: 'view_item', params: {} };
  }
  if (/^\/l\/[^/]+\/[^/]+\/checkout$/.test(path)) {
    return { name: 'booking_request_started', params: {} };
  }
  if (/^\/order\/[^/]+$/.test(path) && previousPath && /\/checkout$/.test(previousPath)) {
    return { name: 'booking_request_sent', params: {} };
  }
  return null;
};

// Funnel event name -> Meta Pixel Standard Event, mirroring the mapping in
// util/analytics.js (kept separate since that one maps our own custom click
// event names, not these route-matched GA4-style names).
const FUNNEL_TO_META_STANDARD_EVENT = {
  search: 'Search',
  view_item: 'ViewContent',
  booking_request_started: 'InitiateCheckout',
  booking_request_sent: 'Lead',
};

// Sends the same funnel steps as GoogleAnalyticsHandler to Meta Pixel, but
// independently of it - Meta Pixel has its own id gate (facebookPixelId,
// checked in util/includeScripts.js, which is what defines window.fbq), so
// this handler is pushed unconditionally and no-ops until fbq exists.
export class MetaPixelHandler {
  trackPageView(canonicalPath, previousPath) {
    if (!window.fbq) {
      return;
    }
    const funnelEvent = matchFunnelEvent(canonicalPath, previousPath);
    const standardEvent = funnelEvent && FUNNEL_TO_META_STANDARD_EVENT[funnelEvent.name];
    if (standardEvent) {
      window.fbq('track', standardEvent, funnelEvent.params);
    }
  }
}

// Google Analytics 4 (GA4) using gtag.js script, which is included in util/includeScripts.js
export class GoogleAnalyticsHandler {
  trackPageView(canonicalPath, previousPath) {
    // GA4 property. Manually send page_view events
    // https://developers.google.com/analytics/devguides/collection/gtagjs/single-page-applications
    // Note 1: You should turn "Enhanced measurement" off.
    //         It attaches own listeners to elements and that breaks in-app navigation.
    // Note 2: If previousPath is null (just after page load), gtag script sends page_view event automatically.
    //         Only in-app navigation needs to be sent manually from SPA.
    // Note 3: Timeout is needed because gtag script picks up <title>,
    //         and location change event happens before initial rendering.
    if (previousPath && window.gtag) {
      window.setTimeout(() => {
        window.gtag('event', 'page_view', {
          page_path: canonicalPath,
        });
      }, 300);
    }

    // Minimum funnel events requested by the Oct 2026 conversion audit:
    // search, listing view, aanvraag gestart (begin_checkout), aanvraag
    // verzonden (request_sent). Sent on the same route-change signal as
    // page_view, since each of these funnel steps is also a navigation.
    if (window.gtag) {
      const funnelEvent = matchFunnelEvent(canonicalPath, previousPath);
      if (funnelEvent) {
        window.gtag('event', funnelEvent.name, funnelEvent.params);
      }
    }
  }
}
