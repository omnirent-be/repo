const { getIntegrationSdk, isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { createViewCounter } = require('../api-util/listingViews');

const counter = createViewCounter({ getSdk: getIntegrationSdk });

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
    res.status(204).end();
    return;
  }

  counter.start();
  counter.recordView({
    listingId: req.body?.listingId,
    visitor: req.ip || 'unknown',
    userAgent: req.get('User-Agent'),
  });
  res.status(204).end();
};

module.exports.counter = counter;
