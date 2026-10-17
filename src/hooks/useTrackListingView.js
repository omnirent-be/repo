import { useEffect } from 'react';

import { trackListingView } from '../util/api';

// A browser reports a given listing at most once per window; the server
// also de-duplicates per visitor, this just avoids pointless requests.
const STORAGE_KEY = 'omnirent_listing_views_v1';
const WINDOW_MS = 12 * 60 * 60 * 1000;
const MAX_STORED = 200;

const readSeen = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
};

const writeSeen = seen => {
  try {
    const entries = Object.entries(seen)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_STORED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (e) {
    // Ignore - e.g. localStorage blocked. We'd just report again next time.
  }
};

/**
 * Reports a view of a listing once the page is open in the browser, so the
 * search page can offer "Populairste" sorting. Skipped for the provider's
 * own listing and for draft/preview variants.
 *
 * @param {string} listingId listing UUID
 * @param {boolean} enabled false for own listings, drafts, errors, loading
 */
const useTrackListingView = (listingId, enabled) => {
  useEffect(() => {
    if (!enabled || !listingId) {
      return;
    }

    const now = Date.now();
    const seen = readSeen();
    if (seen[listingId] && now - seen[listingId] < WINDOW_MS) {
      return;
    }

    writeSeen({ ...seen, [listingId]: now });
    try {
      trackListingView(listingId).catch(() => {
        // A missed view is not worth surfacing to the visitor.
      });
    } catch (e) {
      // Same, e.g. when fetch is unavailable.
    }
  }, [listingId, enabled]);
};

export default useTrackListingView;
