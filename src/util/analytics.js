// A small, direct GA4 custom-event helper for interaction-time analytics
// (a click, a form submit) - distinct from src/analytics/handlers.js, which
// only reacts to route changes. No-ops outside the browser or when GA4
// hasn't loaded (gtag.js is injected via util/includeScripts.js and may not
// be present in dev/test).
export const trackEvent = (name, params = {}) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }
  window.gtag('event', name, {
    device_type: getDeviceType(),
    traffic_source: getTrafficSource(),
    ...params,
  });
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
