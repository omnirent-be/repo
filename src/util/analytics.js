// A small, direct custom-event helper for interaction-time analytics (a
// click, a form submit) - distinct from src/analytics/handlers.js, which
// reacts to route changes and sends the Meta Pixel Standard Events
// (Search/ViewContent/InitiateCheckout/Lead) for the same funnel steps.
// This one only ever sends trackCustom to Meta, not a Standard Event -
// every one of our current custom names (hero_search_started,
// listing_clicked, ...) fires on the same interaction as a route change
// that handlers.js already turns into a Standard Event, so mapping a
// Standard Event here too would double-count it. Sends to both GA4
// (gtag.js) and Meta Pixel (fbq), each injected via util/includeScripts.js
// and each independently optional - no-ops for whichever hasn't loaded
// (e.g. in dev/test, or when the corresponding env var/id isn't configured).
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
