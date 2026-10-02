const sharetribeSdk = require('sharetribe-flex-sdk');
const { getProviderCommissionMaybe, getCustomerCommissionMaybe } = require('./lineItemHelpers');

const { Money } = sharetribeSdk.types;

/**
 * Builds the line items for the extra-day-payment transaction: a single
 * line item priced automatically from the listing's own extra-day price
 * (or its normal daily price as a fallback), never trusted from the
 * client, plus the marketplace's standard commission line items, so the
 * payout math matches every other transaction.
 *
 * @param {number} unitPriceInSubunits per-day price, from the listing's publicData/price
 * @param {number} dayCount number of extra days requested
 * @param {string} currency
 * @param {Object} providerCommission
 * @param {Object} customerCommission
 * @returns {Array} lineItems
 */
exports.extraDayPaymentLineItems = (
  unitPriceInSubunits,
  dayCount,
  currency,
  providerCommission,
  customerCommission
) => {
  const order = {
    code: 'line-item/extra-day',
    unitPrice: new Money(unitPriceInSubunits, currency),
    quantity: dayCount,
    includeFor: ['customer', 'provider'],
  };

  return [
    order,
    ...getProviderCommissionMaybe(providerCommission, order, currency),
    ...getCustomerCommissionMaybe(customerCommission, order, currency),
  ];
};
