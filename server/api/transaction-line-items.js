const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');
const { getCustomerCreditInSubunits } = require('../api-util/customerCredit');
const { hasUsedCoupon } = require('../api-util/couponUsage');

module.exports = (req, res) => {
  const { isOwnListing, listingId, orderData } = req.body || {};

  const sdk = getSdk(req, res);

  const listingPromise = () =>
    isOwnListing
      ? sdk.ownListings.show({ id: listingId, include: ['author'] })
      : sdk.listings.show({ id: listingId, include: ['author'] });

  Promise.all([
    listingPromise(),
    fetchCommission(sdk),
    getCustomerCreditInSubunits(sdk),
    hasUsedCoupon(sdk, orderData?.couponCode),
  ])
    .then(([showListingResponse, fetchAssetsResponse, creditToApplyInSubunits, couponAlreadyUsed]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const authorRef = listing.relationships?.author?.data;
      const author = (showListingResponse.data.included || []).find(
        inc => inc.type === 'user' && inc.id.uuid === authorRef?.id?.uuid
      );
      const providerAccountType = author?.attributes?.profile?.publicData?.accountType || null;

      const lineItems = transactionLineItems(
        listing,
        orderData,
        providerCommission,
        customerCommission,
        creditToApplyInSubunits,
        providerAccountType,
        couponAlreadyUsed
      );

      // Because we are using returned lineItems directly in this template we need to use the helper function
      // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
      const validLineItems = constructValidLineItems(lineItems);

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ data: validLineItems }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
