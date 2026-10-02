const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const { getCustomerCreditInSubunits } = require('../api-util/customerCredit');
const { hasUsedCoupon } = require('../api-util/couponUsage');
const { normalizeCouponCode } = require('../api-util/coupons');

const { Money } = sharetribeSdk.types;

const listingPromise = (sdk, id) => sdk.listings.show({ id, include: ['author'] });

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  return isIntentionToMakeOffer(offerInSubunits, transitionName)
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body || {};
  const transitionName = bodyParams.transition;
  const sdk = getSdk(req, res);
  let lineItems = null;
  let metadataMaybe = {};
  let appliedCreditInSubunits = 0;
  let appliedCouponCode = null;
  let couponShortfallInSubunits = 0;

  Promise.all([
    listingPromise(sdk, bodyParams?.params?.listingId),
    fetchCommission(sdk),
    getCustomerCreditInSubunits(sdk),
    hasUsedCoupon(sdk, orderData?.couponCode),
  ])
    .then(([showListingResponse, fetchAssetsResponse, creditToApplyInSubunits, couponAlreadyUsed]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const currency = listing.attributes.price?.currency || orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const authorRef = listing.relationships?.author?.data;
      const author = (showListingResponse.data.included || []).find(
        inc => inc.type === 'user' && inc.id.uuid === authorRef?.id?.uuid
      );
      const providerAccountType = author?.attributes?.profile?.publicData?.accountType || null;

      lineItems = transactionLineItems(
        listing,
        getFullOrderData(orderData, bodyParams, currency),
        providerCommission,
        customerCommission,
        creditToApplyInSubunits,
        providerAccountType,
        couponAlreadyUsed
      );
      couponShortfallInSubunits = lineItems.couponShortfallInSubunits || 0;
      metadataMaybe = getMetadata(orderData, transitionName);

      const creditLineItem = lineItems.find(li => li.code === 'line-item/customer-credit');
      appliedCreditInSubunits = creditLineItem ? -creditLineItem.unitPrice.amount : 0;

      // The code counts as validly redeemed (and gets marked used-once) as
      // soon as it contributes anything - either as a direct line-item
      // discount, or entirely as a shortfall credit when this booking's
      // margin has no room for it at all.
      const couponLineItem = lineItems.find(li => li.code === 'line-item/coupon-discount');
      const couponAppliedInSubunits = couponLineItem ? -couponLineItem.unitPrice.amount : 0;
      const couponWasRedeemed = couponAppliedInSubunits > 0 || couponShortfallInSubunits > 0;
      appliedCouponCode = couponWasRedeemed ? normalizeCouponCode(orderData?.couponCode) : null;

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
          ...metadataMaybe,
        },
      };

      const initiatePromise = isSpeculative
        ? trustedSdk.transactions.initiateSpeculative(body, queryParams)
        : trustedSdk.transactions.initiate(body, queryParams);

      // Only spend the credit / mark the coupon redeemed once a real
      // (non-speculative) transaction is actually created - a speculative
      // call is just a price preview.
      const needsBookkeeping = !isSpeculative && (appliedCreditInSubunits > 0 || appliedCouponCode);
      if (!needsBookkeeping) {
        return initiatePromise;
      }

      return initiatePromise.then(apiResponse =>
        trustedSdk.currentUser
          .show()
          .then(showCurrentUserResponse => {
            const privateData =
              showCurrentUserResponse.data.data.attributes.profile.privateData || {};
            const currentBalance = privateData.creditBalanceInSubunits || 0;
            const usedCouponCodes = privateData.usedCouponCodes || [];

            // A coupon shortfall (the part of its value that didn't fit in
            // this booking's margin) is granted as ordinary account credit,
            // so the customer still gets the code's full value even if it
            // has to be split across two bookings.
            const newBalance = Math.max(
              0,
              currentBalance - appliedCreditInSubunits + couponShortfallInSubunits
            );
            const creditBalanceMaybe =
              appliedCreditInSubunits > 0 || couponShortfallInSubunits > 0
                ? { creditBalanceInSubunits: newBalance }
                : {};
            // Each coupon code is one-time per customer - record it as
            // redeemed so it can never apply to a later booking (see
            // couponUsage.js).
            const usedCouponCodesMaybe =
              appliedCouponCode && !usedCouponCodes.includes(appliedCouponCode)
                ? { usedCouponCodes: [...usedCouponCodes, appliedCouponCode] }
                : {};

            return trustedSdk.currentUser.updateProfile({
              privateData: { ...creditBalanceMaybe, ...usedCouponCodesMaybe },
            });
          })
          // Never let this bookkeeping failure undo an already created (and
          // possibly already paid) booking.
          .catch(e => {
            console.error(
              '[referral] Failed to update credit/coupon bookkeeping after transaction was created:',
              e
            );
          })
          .then(() => apiResponse)
      );
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
