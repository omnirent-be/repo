const { normalizeCouponCode } = require('./coupons');

/**
 * Whether the current user has already redeemed the given coupon code on a
 * real (non-speculative) transaction - see initiate-privileged.js for where
 * `privateData.usedCouponCodes` is appended to, only after a real booking
 * succeeds. Mirrors the old one-time signup bonus: a code can only ever
 * discount one booking per customer.
 *
 * Must never throw: transaction-line-items.js and initiate-privileged.js are
 * called for anonymous visitors too (e.g. a public price preview before
 * login), where sdk.currentUser.show() legitimately fails. Any error here
 * just means "treat the code as unused", not "break checkout for everyone".
 *
 * @param {Object} sdk
 * @param {string} [couponCode]
 * @returns {Promise<boolean>}
 */
const hasUsedCoupon = (sdk, couponCode) => {
  const normalized = normalizeCouponCode(couponCode);
  if (!normalized) {
    return Promise.resolve(false);
  }

  return sdk.currentUser
    .show()
    .then(response => {
      const currentUser = response.data.data;
      const usedCouponCodes = currentUser.attributes.profile.privateData?.usedCouponCodes || [];
      return usedCouponCodes.includes(normalized);
    })
    .catch(() => false);
};

module.exports = { hasUsedCoupon };
