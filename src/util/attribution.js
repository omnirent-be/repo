// Captures where a visitor came from (UTM parameters + the first landing page) so the
// rental lead form can include it in the lead e-mail, even after the visitor has
// navigated around the site (a listing, back to the landing page, etc.) and the
// current URL no longer carries the query string. First-party, stored only in
// sessionStorage (this tab, this visit) and never sent to GA4/Meta - see
// RentalLeadForm.js and server/api/lead.js for where it's actually used.
const STORAGE_KEY = 'omnirent_attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
export const UNKNOWN = 'unknown';

const isBrowser = () => typeof window !== 'undefined';

const emptyAttribution = () => {
  const data = { landingPage: UNKNOWN };
  UTM_KEYS.forEach(key => {
    data[key] = UNKNOWN;
  });
  return data;
};

/**
 * Call once per page load (see RentalLandingPage.js). Stores the UTM parameters and
 * landing page path the first time a visitor arrives with any UTM parameter present -
 * later page views in the same tab/session never overwrite it, so the original ad
 * click is what the lead e-mail reflects, not wherever the visitor happens to submit
 * the form from.
 */
export const captureAttribution = () => {
  if (!isBrowser()) {
    return;
  }
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const hasAnyUtm = UTM_KEYS.some(key => !!params.get(key));
    if (!hasAnyUtm) {
      return;
    }
    const data = { landingPage: window.location.pathname + window.location.search };
    UTM_KEYS.forEach(key => {
      data[key] = params.get(key) || UNKNOWN;
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Private browsing or blocked storage - attribution is best-effort, never required.
  }
};

/**
 * Reads back whatever captureAttribution stored this session. Missing fields (no
 * UTM-bearing page seen yet, or storage unavailable) are reported as 'unknown'
 * rather than guessed or backfilled from the current page.
 */
export const getAttribution = () => {
  if (!isBrowser()) {
    return emptyAttribution();
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return emptyAttribution();
    }
    const parsed = JSON.parse(stored);
    const data = { landingPage: parsed.landingPage || UNKNOWN };
    UTM_KEYS.forEach(key => {
      data[key] = parsed[key] || UNKNOWN;
    });
    return data;
  } catch (e) {
    return emptyAttribution();
  }
};
