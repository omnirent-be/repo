/**
 * Counts listing page views and stores the running total on each listing's
 * metadata (`metadata.viewCount`), which is what the search page's
 * "Populairste" sort option (`sort=meta_viewCount`) orders by.
 *
 * Writing listing metadata needs the Integration API (see
 * server/api-util/integrationSdk.js), so this only works once
 * SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET are set. In addition, the
 * `viewCount` metadata key needs a search schema so the Marketplace API is
 * allowed to sort on it - one-time setup, with flex-cli:
 *
 *   flex-cli search set --key viewCount --scope metadata --type long \
 *     --marketplace <marketplace-id>
 *
 * Design notes:
 * - Views are de-duplicated per visitor (IP) per listing for an hour, so
 *   refreshing the page or a bot loop cannot inflate the numbers.
 * - Obvious crawlers are ignored.
 * - Increments are batched in memory and flushed on an interval, instead of
 *   one Integration API write per page view.
 */

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const FLUSH_INTERVAL_MS = 30 * 1000;
const MAX_TRACKED_VISITORS = 50000;
const MAX_PENDING_LISTINGS = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|lighthouse/i;

const isValidListingId = id => typeof id === 'string' && UUID_RE.test(id);
const isBot = userAgent => !userAgent || BOT_RE.test(userAgent);

/**
 * @param {Object} options
 * @param {Function} options.getSdk returns the Integration SDK instance or null
 * @param {Function} [options.now] clock, injectable for tests
 * @returns {{ recordView: Function, flush: Function, start: Function }}
 */
const createViewCounter = ({ getSdk, now = () => Date.now() }) => {
  const seen = new Map(); // `${visitor}:${listingId}` -> timestamp
  const pending = new Map(); // listingId -> number of views not yet written
  let timer = null;

  const pruneSeen = () => {
    const cutoff = now() - DEDUPE_WINDOW_MS;
    seen.forEach((time, key) => {
      if (time < cutoff) {
        seen.delete(key);
      }
    });
  };

  /**
   * @param {{ listingId: string, visitor: string, userAgent?: string }} view
   * @returns {boolean} true if the view was counted
   */
  const recordView = ({ listingId, visitor, userAgent }) => {
    if (!isValidListingId(listingId) || isBot(userAgent)) {
      return false;
    }
    const key = `${visitor}:${listingId}`;
    const lastSeen = seen.get(key);
    if (lastSeen != null && now() - lastSeen < DEDUPE_WINDOW_MS) {
      return false;
    }
    if (seen.size >= MAX_TRACKED_VISITORS) {
      pruneSeen();
    }
    if (pending.size >= MAX_PENDING_LISTINGS && !pending.has(listingId)) {
      return false;
    }
    seen.set(key, now());
    pending.set(listingId, (pending.get(listingId) || 0) + 1);
    return true;
  };

  const writeCount = (sdk, listingId, delta) =>
    sdk.listings
      .show({ id: listingId })
      .then(response => {
        const current = Number(response.data.data.attributes.metadata?.viewCount) || 0;
        return sdk.listings
          .update({ id: listingId, metadata: { viewCount: current + delta } })
          .then(() => {
            // eslint-disable-next-line no-console
            console.log(`Stored view count for listing ${listingId}: ${current + delta}`);
          });
      })
      .catch(error => {
        // Unknown listing: nothing to retry. Anything else (rate limit,
        // network): put the views back for the next flush.
        if (error?.status !== 404) {
          pending.set(listingId, (pending.get(listingId) || 0) + delta);
        }
        // eslint-disable-next-line no-console
        console.error(`Failed to store view count for listing ${listingId}:`, error?.message || '');
      });

  /**
   * Writes all batched views to the listings. Resolves when done.
   */
  const flush = () => {
    const sdk = getSdk();
    if (!sdk || pending.size === 0) {
      return Promise.resolve();
    }
    const batch = Array.from(pending.entries());
    pending.clear();
    // One listing at a time keeps us well within Integration API rate limits.
    return batch.reduce(
      (chain, [listingId, delta]) => chain.then(() => writeCount(sdk, listingId, delta)),
      Promise.resolve()
    );
  };

  const start = () => {
    if (timer) {
      return;
    }
    timer = setInterval(flush, FLUSH_INTERVAL_MS);
    if (timer.unref) {
      timer.unref();
    }
  };

  return { recordView, flush, start };
};

module.exports = { createViewCounter, isValidListingId, isBot };
