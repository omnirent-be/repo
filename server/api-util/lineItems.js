const {
  calculateQuantityFromDates,
  calculateQuantityFromHours,
  calculateShippingFee,
  calculateTotalFromLineItems,
  calculateTotalForCustomer,
  calculateTotalForProvider,
  getProviderCommissionMaybe,
  getCustomerCommissionMaybe,
} = require('./lineItemHelpers');
const { getCouponDiscountInSubunits } = require('./coupons');
const { estimateDeliveryDistanceKm } = require('./distance');
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

// Belgian standard VAT rate. Only companies (accountType: 'company', set at
// signup) are assumed to be VAT-registered - individual/particulier
// providers are not, so they must never have VAT added to their price.
const PROVIDER_VAT_PERCENTAGE = 21;

// How much the 2nd and later rental days are discounted when a provider
// enables weekendDiscountEnabled on their listing (see
// EditListingPricingForm.js) - most party/event equipment is booked for a
// whole weekend, not a single day, so this rewards longer bookings instead
// of charging a flat rate per day.
const MULTI_DAY_DISCOUNT_PERCENTAGE = 50;

/**
 * A separate, purely negative line item for the weekend/multi-day discount
 * (see MULTI_DAY_DISCOUNT_PERCENTAGE above) - not baked into the base
 * `order` line item's own unitPrice/quantity, so every existing calculation
 * that reads `order` alone (VAT, provider/customer commission, the coupon
 * minimum-spend check) keeps computing against the full, undiscounted
 * order value, exactly as it already does for shipping fees. Marketplace
 * API line items are always unitPrice x quantity, so "day 1 full price,
 * day 2+ at 50%" genuinely needs its own line item - it can't be expressed
 * as a single line item with one unitPrice.
 *
 * @param {Object} publicData - listing's publicData (reads weekendDiscountEnabled)
 * @param {Object} order - the base line-item/day or line-item/night line item
 * @param {number} [quantity] - number of days/nights (only set for the plain
 *   quantity-based booking path, not the units+seats path - multi-day
 *   discount only applies there today)
 * @param {string} currency
 */
// `daysCount` is `units` when the booking has seats (multiple identical
// items, e.g. 20 chairs) and plain `quantity` otherwise - see
// transactionLineItems' call site. Either way it's the number of
// day/night units in the booking; when seats are present, the discount
// line item itself must also carry `seats` so it scales with how many
// units were actually discounted (a 20-chair booking's 2nd night should
// discount 20x as much as a 1-chair booking's, not the same flat amount).
const getMultiDayDiscountLineItemMaybe = (publicData, order, daysCount, seats, currency) => {
  const isEnabled = !!publicData?.weekendDiscountEnabled;
  const isEligibleUnitType = ['line-item/day', 'line-item/night'].includes(order?.code);
  const hasDiscountedDays = Number.isInteger(daysCount) && daysCount > 1;
  const hasValidUnitPrice = order?.unitPrice instanceof Money;

  if (!isEnabled || !isEligibleUnitType || !hasDiscountedDays || !hasValidUnitPrice) {
    return [];
  }

  const discountedDays = daysCount - 1;
  const discountPerDayInSubunits = Math.round(
    order.unitPrice.amount * (MULTI_DAY_DISCOUNT_PERCENTAGE / 100)
  );
  const quantityOrSeatsMaybe = seats
    ? { units: discountedDays, seats }
    : { quantity: discountedDays };

  return [
    {
      code: 'line-item/multi-day-discount',
      unitPrice: new Money(-discountPerDayInSubunits, currency),
      ...quantityOrSeatsMaybe,
      includeFor: ['customer', 'provider'],
    },
  ];
};

/**
 * VAT that a company-type provider owes on their own rental price (and
 * delivery fee, if any) - added to what the customer pays, and passed
 * straight through to the provider's payout, since it's the provider's own
 * VAT liability to remit, not marketplace revenue.
 *
 * @param {string} providerAccountType - 'individual' | 'company' | undefined
 * @param {Object} order - the base price line item
 * @param {Array} extraLineItems - e.g. shipping fee, also owed by the provider
 * @param {string} currency
 */
const getProviderVatMaybe = (providerAccountType, order, extraLineItems, currency) => {
  if (providerAccountType !== 'company') {
    return [];
  }

  const vatBase = calculateTotalFromLineItems([order, ...extraLineItems]);

  return [
    {
      code: 'line-item/provider-vat',
      unitPrice: vatBase,
      percentage: PROVIDER_VAT_PERCENTAGE,
      includeFor: ['customer', 'provider'],
    },
  ];
};

/**
 * Get quantity for items (e.g. unitType 'item', "buy this many of the same thing").
 *
 * @param {Object} orderData should contain stockReservationQuantity
 */
const getItemQuantityAndLineItems = orderData => {
  const quantity = orderData ? orderData.stockReservationQuantity : null;
  return { quantity, extraLineItems: [] };
};

/**
 * Delivery fee for a 'shipping' booking - applies to every bookable unit
 * type (day/night/hour/fixed/item), since delivery is a one-off trip
 * regardless of how many days the item is rented for, not something that
 * scales with rental duration. Two pricing modes, in priority order:
 *
 * 1. Per-km (publicData.deliveryPricePerKmInSubunits, set by the provider
 *    in EditListingDeliveryForm): fee = distance (listing <-> customer's
 *    postal code, see distance.js) x price per km. Only resolves once the
 *    listing has a geolocation AND the customer's Belgian postal code is
 *    known (protectedData.shippingDetails, filled in on the checkout page)
 *    - until then this simply returns no fee yet, same as "not entered".
 * 2. The older flat shippingPriceInSubunitsOneItem/AdditionalItems fields,
 *    kept as a fallback for listings that haven't set a price-per-km.
 *
 * @param {Object} orderData should contain deliveryMethod, stockReservationQuantity,
 *   and protectedData.shippingDetails.address.{postalCode,country} once the customer has
 *   filled those in
 * @param {Object} listing full listing entity (needs publicData and geolocation)
 * @param {string} currency should point to the currency of listing's price
 */
const getDeliveryLineItems = (orderData, listing, currency) => {
  const deliveryMethod = orderData && orderData.deliveryMethod;
  if (deliveryMethod !== 'shipping') {
    return [];
  }

  const publicData = listing.attributes.publicData || {};
  const {
    deliveryPricePerKmInSubunits,
    shippingPriceInSubunitsOneItem,
    shippingPriceInSubunitsAdditionalItems,
  } = publicData;

  if (deliveryPricePerKmInSubunits != null) {
    const address = orderData?.protectedData?.shippingDetails?.address;
    const distanceKm = estimateDeliveryDistanceKm({
      listingGeolocation: listing.attributes.geolocation,
      postalCode: address?.postalCode,
      country: address?.country,
    });
    if (distanceKm == null) {
      // Address not filled in (or not in Belgium) yet - no fee to show
      // until then. See CheckoutPageWithPayment.js: the checkout page
      // re-requests a price as soon as the customer's postal code is known.
      return [];
    }
    const feeInSubunits = Math.round(distanceKm * deliveryPricePerKmInSubunits);
    return [
      {
        code: 'line-item/shipping-fee',
        unitPrice: new Money(feeInSubunits, currency),
        quantity: 1,
        includeFor: ['customer', 'provider'],
      },
    ];
  }

  // stockReservationQuantity ("how many of this item") only applies to
  // unitType 'item'; bookable types (day/night/hour/fixed) use `seats` for
  // "how many units of this booking" instead - default to a single
  // delivery trip when neither is set, since delivery doesn't scale with
  // rental duration on its own.
  const quantity = orderData?.stockReservationQuantity || orderData?.seats || 1;
  const shippingFee = calculateShippingFee(
    shippingPriceInSubunitsOneItem,
    shippingPriceInSubunitsAdditionalItems,
    currency,
    quantity
  );

  return shippingFee
    ? [
        {
          code: 'line-item/shipping-fee',
          unitPrice: shippingFee,
          quantity: 1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : [];
};

const getOfferQuantityAndLineItems = orderData => {
  return { quantity: 1, extraLineItems: [] };
};

/**
 * Get quantity for digital items. The quantity is always 1, you can't have multiples of digital files.
 * @param {Object} orderData
 */
const getDigitalItemQuantityAndLineItems = orderData => {
  return { quantity: 1, extraLineItems: [] };
};

/**
 * Get quantity for fixed bookings with seats.
 * @param {Object} orderData
 * @param {number} [orderData.seats]
 */
const getFixedQuantityAndLineItems = orderData => {
  const { seats } = orderData || {};
  const hasSeats = !!seats;
  // If there are seats, the quantity is split to factors: units and seats.
  // E.g. 1 session x 2 seats (aka unit price is multiplied by 2)
  return hasSeats ? { units: 1, seats, extraLineItems: [] } : { quantity: 1, extraLineItems: [] };
};

/**
 * Get quantity for arbitrary units for time-based bookings.
 *
 * @param {Object} orderData
 * @param {string} orderData.bookingStart
 * @param {string} orderData.bookingEnd
 * @param {number} [orderData.seats]
 */
const getHourQuantityAndLineItems = orderData => {
  const { bookingStart, bookingEnd, seats } = orderData || {};
  const hasSeats = !!seats;
  const units =
    bookingStart && bookingEnd ? calculateQuantityFromHours(bookingStart, bookingEnd) : null;

  // If there are seats, the quantity is split to factors: units and seats.
  // E.g. 3 hours x 2 seats (aka unit price is multiplied by 6)
  return hasSeats ? { units, seats, extraLineItems: [] } : { quantity: units, extraLineItems: [] };
};

/**
 * Calculate quantity based on days or nights between given bookingDates.
 *
 * @param {Object} orderData
 * @param {string} orderData.bookingStart
 * @param {string} orderData.bookingEnd
 * @param {number} [orderData.seats]
 * @param {'line-item/day' | 'line-item/night'} code
 */
const getDateRangeQuantityAndLineItems = (orderData, code) => {
  const { bookingStart, bookingEnd, seats } = orderData;
  const hasSeats = !!seats;
  const units =
    bookingStart && bookingEnd ? calculateQuantityFromDates(bookingStart, bookingEnd, code) : null;

  // If there are seats, the quantity is split to factors: units and seats.
  // E.g. 3 nights x 4 seats (aka unit price is multiplied by 12)
  return hasSeats ? { units, seats, extraLineItems: [] } : { quantity: units, extraLineItems: [] };
};

/**
 * Returns collection of lineItems (max 50)
 *
 * All the line-items dedicated to _customer_ define the "payin total".
 * Similarly, the sum of all the line-items included for _provider_ create "payout total".
 * Platform gets the commission, which is the difference between payin and payout totals.
 *
 * Each line items has following fields:
 * - `code`: string, mandatory, indentifies line item type (e.g. \"line-item/cleaning-fee\"), maximum length 64 characters.
 * - `unitPrice`: money, mandatory
 * - `lineTotal`: money
 * - `quantity`: number
 * - `percentage`: number (e.g. 15.5 for 15.5%)
 * - `seats`: number
 * - `units`: number
 * - `includeFor`: array containing strings \"customer\" or \"provider\", default [\":customer\"  \":provider\" ]
 *
 * Line item must have either `quantity` or `percentage` or both `seats` and `units`.
 *
 * `includeFor` defines commissions. Customer commission is added by defining `includeFor` array `["customer"]` and provider commission by `["provider"]`.
 *
 * @param {Object} listing
 * @param {Object} orderData
 * @param {string} [orderData.priceVariantName] - The name of the price variant (potentially used with bookable unit types)
 * @param {Money} [orderData.offer] - The offer for the offer (if transition intent is "make-offer")
 * @param {Object} providerCommission
 * @param {Object} customerCommission
 * @param {number} [creditToApplyInSubunits] - Customer's platform credit (referral program etc.)
 *   to apply as a discount.
 * @param {string} [orderData.couponCode] - A promotional code (e.g. "GENT10") looked up
 *   server-side via coupons.js. Each code also has its own minimum order value there -
 *   below it, the code resolves to no discount at all, same as an unknown code.
 * @param {boolean} [couponAlreadyUsed] - Whether the current customer has already redeemed
 *   this coupon code on a past booking (see couponUsage.js) - each code is one-time per
 *   customer, so an already-used code is treated the same as an unknown one.
 *
 *   Both discounts are funded by the platform's own commission, never the provider's payout:
 *   combined, they're capped at the platform's margin on the order (what the customer would
 *   pay minus what the provider is owed, before any discount). Going further than that would
 *   make payin < payout, which the Marketplace API rejects when the payment is created. Any
 *   coupon amount that doesn't fit is reported back via the returned array's
 *   `couponShortfallInSubunits` property, so the caller can grant it as account credit
 *   instead (see initiate-privileged.js).
 * @returns {Array} lineItems - also carries a `couponShortfallInSubunits` number property
 */
exports.transactionLineItems = (
  listing,
  orderData,
  providerCommission,
  customerCommission,
  creditToApplyInSubunits = 0,
  providerAccountType = null,
  couponAlreadyUsed = false
) => {
  const publicData = listing.attributes.publicData;
  // Note: the unitType needs to be one of the following:
  // day, night, hour, fixed, or item (these are related to payment processes)
  const { unitType, priceVariants, priceVariationsEnabled } = publicData;

  const isBookable = ['day', 'night', 'hour', 'fixed'].includes(unitType);
  const isNegotiationUnitType = ['offer', 'request'].includes(unitType);
  const priceAttribute = listing.attributes.price;
  const currency = priceAttribute?.currency || orderData.currency;

  const { priceVariantName, offer } = orderData || {};
  const priceVariantConfig = priceVariants
    ? priceVariants.find(pv => pv.name === priceVariantName)
    : null;
  const { priceInSubunits } = priceVariantConfig || {};
  const isPriceInSubunitsValid = Number.isInteger(priceInSubunits) && priceInSubunits >= 0;

  const unitPrice =
    isBookable && priceVariationsEnabled && isPriceInSubunitsValid
      ? new Money(priceInSubunits, currency)
      : offer instanceof Money && isNegotiationUnitType
      ? offer
      : priceAttribute;

  /**
   * Pricing starts with order's base price:
   * Listing's price is related to a single unit. It needs to be multiplied by quantity
   *
   * Initial line-item needs therefore:
   * - code (based on unitType)
   * - unitPrice
   * - quantity
   * - includedFor
   */

  const code = `line-item/${unitType}`;

  const quantityAndExtraLineItems =
    unitType === 'item'
      ? getItemQuantityAndLineItems(orderData)
      : unitType === 'file'
      ? getDigitalItemQuantityAndLineItems(orderData)
      : unitType === 'fixed'
      ? getFixedQuantityAndLineItems(orderData)
      : unitType === 'hour'
      ? getHourQuantityAndLineItems(orderData)
      : ['day', 'night'].includes(unitType)
      ? getDateRangeQuantityAndLineItems(orderData, code)
      : isNegotiationUnitType
      ? getOfferQuantityAndLineItems(orderData)
      : {};

  const { quantity, units, seats } = quantityAndExtraLineItems;
  // Delivery fee applies uniformly across unit types (see
  // getDeliveryLineItems) rather than being tied to a specific one - a
  // rental's delivery trip doesn't scale with rental duration/quantity.
  const extraLineItems = getDeliveryLineItems(orderData, listing, currency);

  // Throw error if there is no quantity information given
  if (!quantity && !(units && seats)) {
    const missingFields = [];

    if (!quantity) missingFields.push('quantity');
    if (!units) missingFields.push('units');
    if (!seats) missingFields.push('seats');

    const message = `Error: orderData is missing the following information: ${missingFields.join(
      ', '
    )}. Quantity or either units & seats is required.`;

    const error = new Error(message);
    error.status = 400;
    error.statusText = message;
    error.data = {};
    throw error;
  }

  /**
   * If you want to use pre-defined component and translations for printing the lineItems base price for order,
   * you should use one of the codes:
   * line-item/night, line-item/day, line-item/hour or line-item/item.
   *
   * Pre-definded commission components expects line item code to be one of the following:
   * 'line-item/provider-commission', 'line-item/customer-commission'
   *
   * By default OrderBreakdown prints line items inside LineItemUnknownItemsMaybe if the lineItem code is not recognized. */

  const quantityOrSeats = !!units && !!seats ? { units, seats } : { quantity };
  const order = {
    code,
    unitPrice,
    ...quantityOrSeats,
    includeFor: ['customer', 'provider'],
  };

  const multiDayDiscountLineItems = getMultiDayDiscountLineItemMaybe(
    publicData,
    order,
    units || quantity,
    seats,
    currency
  );

  const providerVatMaybe = getProviderVatMaybe(providerAccountType, order, extraLineItems, currency);
  const providerCommissionMaybe = getProviderCommissionMaybe(providerCommission, order, currency);
  const customerCommissionMaybe = getCustomerCommissionMaybe(customerCommission, order, currency);

  // The order's own base value (before any discount) - what a coupon's
  // minimum-spend requirement is checked against. Listings without a set
  // price yet (e.g. negotiation) have no unitPrice, so treat that as 0 -
  // never meets a minimum, which is the correct "no discount" outcome.
  const orderSubtotalInSubunits =
    order.unitPrice instanceof Money ? calculateTotalFromLineItems([order]).amount : 0;

  // Only bother computing the safe-discount cap (which needs a fully priced
  // order) when there's actually a credit or coupon to apply - keeps the
  // common no-discount path, including listings without a set price yet
  // (e.g. negotiation), untouched.
  const couponDiscountInSubunits = couponAlreadyUsed
    ? 0
    : getCouponDiscountInSubunits(orderData?.couponCode, orderSubtotalInSubunits);
  let creditLineItemsMaybe = [];
  let couponLineItemsMaybe = [];
  let couponShortfallInSubunits = 0;

  if (creditToApplyInSubunits > 0 || couponDiscountInSubunits > 0) {
    // Everything the customer would pay and the provider would be owed,
    // before any credit/coupon discount - the gap between the two (the
    // platform's own margin) is the most that can safely be discounted. See
    // the funding-model note in this function's docstring above.
    const preDiscountLineItems = [
      order,
      ...extraLineItems,
      ...multiDayDiscountLineItems,
      ...providerVatMaybe,
      ...providerCommissionMaybe,
      ...customerCommissionMaybe,
    ];
    const customerTotal = calculateTotalForCustomer(preDiscountLineItems).amount;
    const providerTotal = calculateTotalForProvider(preDiscountLineItems).amount;
    const maxDiscountInSubunits = Math.max(0, customerTotal - providerTotal);

    creditLineItemsMaybe = getCustomerCreditLineItemMaybe(
      creditToApplyInSubunits,
      maxDiscountInSubunits,
      currency
    );
    const creditAppliedInSubunits = creditLineItemsMaybe.length
      ? -creditLineItemsMaybe[0].unitPrice.amount
      : 0;

    couponLineItemsMaybe = getCouponDiscountLineItemMaybe(
      couponDiscountInSubunits,
      maxDiscountInSubunits - creditAppliedInSubunits,
      currency
    );
    const couponAppliedInSubunits = couponLineItemsMaybe.length
      ? -couponLineItemsMaybe[0].unitPrice.amount
      : 0;
    // A coupon is a fixed advertised amount, not the customer's own balance
    // like credit - if this booking's margin can't cover all of it, the
    // difference is granted as account credit instead (see
    // initiate-privileged.js), so the customer still gets the full value,
    // just possibly split across two bookings instead of silently getting
    // less than the code promised.
    couponShortfallInSubunits = Math.max(0, couponDiscountInSubunits - couponAppliedInSubunits);
  }

  // Let's keep the base price (order) as first line item and provider and customer commissions as last.
  // Note: the order matters only if OrderBreakdown component doesn't recognize line-item.
  const lineItems = [
    order,
    ...extraLineItems,
    ...multiDayDiscountLineItems,
    ...providerVatMaybe,
    ...providerCommissionMaybe,
    ...customerCommissionMaybe,
    ...creditLineItemsMaybe,
    ...couponLineItemsMaybe,
  ];

  // Attached rather than returned as `{ lineItems, couponShortfallInSubunits }`
  // so this function's return value stays a plain Array, exactly as every
  // existing caller (and lineItems.test.js) already expects - callers that
  // care about the shortfall (see initiate-privileged.js) read it off the
  // array, everyone else can ignore it.
  lineItems.couponShortfallInSubunits = couponShortfallInSubunits;
  return lineItems;
};

const getCustomerCreditLineItemMaybe = (creditToApplyInSubunits, maxDiscountInSubunits, currency) => {
  if (!creditToApplyInSubunits || creditToApplyInSubunits <= 0) {
    return [];
  }

  const creditInSubunits = Math.min(creditToApplyInSubunits, maxDiscountInSubunits);

  return creditInSubunits > 0
    ? [
        {
          code: 'line-item/customer-credit',
          unitPrice: new Money(-creditInSubunits, currency),
          quantity: 1,
          includeFor: ['customer'],
        },
      ]
    : [];
};

/**
 * Same capping logic as customer credit, but against whatever safe discount
 * room credit hasn't already used up (the caller passes the remainder).
 */
const getCouponDiscountLineItemMaybe = (couponDiscountInSubunits, maxDiscountInSubunits, currency) => {
  if (!couponDiscountInSubunits || couponDiscountInSubunits <= 0) {
    return [];
  }

  const discountInSubunits = Math.min(couponDiscountInSubunits, Math.max(0, maxDiscountInSubunits));

  return discountInSubunits > 0
    ? [
        {
          code: 'line-item/coupon-discount',
          unitPrice: new Money(-discountInSubunits, currency),
          quantity: 1,
          includeFor: ['customer'],
        },
      ]
    : [];
};
