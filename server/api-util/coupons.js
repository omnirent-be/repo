// Fixed promotional discount codes (e.g. shared on flyers/social media),
// separate from the per-user referral credit system in customerCredit.js.
// The amounts live here, server-side only - the client only ever sends the
// code the customer typed, never the discount amount, so a code can't be
// forged to a higher value. Each code is usable once per customer - see
// couponUsage.js for the redemption check.
const COUPONS = {
  GENT10: {
    discountInSubunits: 1000, // EUR 10.00
    minOrderInSubunits: 2500, // Only valid on bookings of EUR 25.00 or more
  },
};

/**
 * Case/whitespace-insensitive normal form of a coupon code, so "gent10 " and
 * "GENT10" are treated as the same code everywhere (lookup, redemption
 * tracking). Returns null for anything that isn't a non-empty string.
 *
 * @param {string} [couponCode]
 * @returns {string|null}
 */
const normalizeCouponCode = couponCode =>
  typeof couponCode === 'string' && couponCode.trim() ? couponCode.trim().toUpperCase() : null;

/**
 * Looks up the discount for a coupon code, in subunits - 0 if the code is
 * unknown, or if the order's base value doesn't reach the code's minimum
 * spend (e.g. GENT10 needs at least EUR 25.00 before it discounts anything).
 * Callers never need to branch on "is this valid", they just get 0 either way.
 *
 * @param {string} [couponCode]
 * @param {number} [orderSubtotalInSubunits] - The order's base value (before
 *   any discount) that the minimum spend is checked against.
 * @returns {number}
 */
const getCouponDiscountInSubunits = (couponCode, orderSubtotalInSubunits = 0) => {
  const normalized = normalizeCouponCode(couponCode);
  const coupon = normalized ? COUPONS[normalized] : null;
  if (!coupon) {
    return 0;
  }
  const meetsMinimum = orderSubtotalInSubunits >= coupon.minOrderInSubunits;
  return meetsMinimum ? coupon.discountInSubunits : 0;
};

module.exports = { getCouponDiscountInSubunits, normalizeCouponCode };
