// Our own custom event names mapped to the closest Meta Pixel Standard Event,
// sent alongside the custom event so Meta Ads can optimize/report on them
// (Standard Events get richer support in Ads Manager than trackCustom alone).
// See https://developers.facebook.com/docs/meta-pixel/reference#standard-events
const META_STANDARD_EVENTS = {
  hero_search_started: 'Search',
  listing_clicked: 'ViewContent',
  booking_request_started: 'InitiateCheckout',
  booking_request_sent: 'Lead',
};

// A small, direct custom-event helper for interaction-time analytics (a
// click, a form submit) - distinct from src/analytics/handlers.js, which
// only reacts to route changes. Sends to both GA4 (gtag.js) and Meta Pixel
// (fbq), each injected via util/includeScripts.js and each independently
// optional - no-ops for whichever hasn't loaded (e.g. in dev/test, or when
// the corresponding env var/id isn't configured).
export const trackEvent = (name, params = {}) => {
  if (typeof window === 'undefined') {
    return;
  }
  const enrichedParams = {
    device_type: getDeviceType(),
    traffic_source: getTrafficSource(),
    ...params,
  };
  if (window.gtag) {
    window.gtag('event', name, enrichedParams);
  }
  if (window.fbq) {
    window.fbq('trackCustom', name, enrichedParams);
    const standardEvent = META_STANDARD_EVENTS[name];
    if (standardEvent) {
      window.fbq('track', standardEvent, enrichedParams);
    }
  }
};

const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1023;

export const getDeviceType = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const width = window.innerWidth;
  if (width <= MOBILE_MAX_WIDTH) {
    return 'mobile';
  }
  if (width <= TABLET_MAX_WIDTH) {
    return 'tablet';
  }
  return 'desktop';
};

// Prefers an explicit utm_source (set by our own marketing links) over the
// browser's referrer, since the referrer is only ever the immediately
// preceding page (useless once a visitor has already clicked around the
// site) and is empty for most direct/app traffic anyway.
export const getTrafficSource = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const utmSource = new URLSearchParams(window.location.search).get('utm_source');
  if (utmSource) {
    return utmSource;
  }
  if (document.referrer) {
    try {
      return new URL(document.referrer).hostname;
    } catch (e) {
      return 'direct';
    }
  }
  return 'direct';
};
