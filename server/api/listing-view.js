const { getIntegrationSdk, isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { createViewCounter } = require('../api-util/listingViews');

const counter = createViewCounter({ getSdk: getIntegrationSdk });
let warnedNotConfigured = false;
let warnedIgnored = false;

/**
 * Records one page view of a listing (see src/hooks/useTrackListingView.js).
 * Fire-and-forget: it always answers quickly with 204 and never blocks or
 * breaks the listing page. Deliberately takes no Sharetribe auth - anyone,
 * logged in or not, can view a listing.
 *
 * Body: { listingId: string (UUID) }
 */
module.exports = (req, res) => {
  if (!isIntegrationSdkConfigured()) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      // eslint-disable-next-line no-console
      console.warn(
        'Listing views are not stored: SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET are not set.'
      );
    }
    res.status(204).end();
    return;
  }

  counter.start();
  const counted = counter.recordView({
    listingId: req.body?.listingId,
    visitor: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
  });
  if (!counted && !warnedIgnored) {
    warnedIgnored = true;
    // eslint-disable-next-line no-console
    console.log(
      `Listing view ignored (invalid id, bot or duplicate). listingId=${req.body?.listingId}`
    );
  }
  res.status(204).end();
};

module.exports.counter = counter;
