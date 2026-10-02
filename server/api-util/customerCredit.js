/**
 * The current user's platform credit balance, in subunits. Nothing grants
 * new credit any more (the automatic signup bonus was replaced by the
 * GENT10 coupon code, see server/api-util/coupons.js) - this only still
 * applies to accounts that were credited before that change. Closed-loop
 * credit only.
 *
 * This is a "nice to have" on top of pricing, never a requirement for it -
 * transaction-line-items.js and initiate-privileged.js are called for
 * anonymous visitors too (e.g. a public price preview before login), where
 * sdk.currentUser.show() legitimately fails. Must never throw: any error
 * here (no session, expired token, network hiccup, ...) just means "no
 * credit to apply", not "break checkout for everyone".
 */
const getCustomerCreditInSubunits = sdk =>
  sdk.currentUser
    .show()
    .then(response => {
      const currentUser = response.data.data;
      return currentUser.attributes.profile.privateData?.creditBalanceInSubunits || 0;
    })
    .catch(() => 0);

module.exports = { getCustomerCreditInSubunits };
