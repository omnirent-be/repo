const sharetribeSdk = require('sharetribe-flex-sdk');

const { Money } = sharetribeSdk.types;

/**
 * Builds the line items for the deposit-hold transaction: a single line
 * item for the full deposit amount, with no commission - the deposit is
 * either fully refunded to the customer (release) or fully paid out to
 * the provider (claim), never a source of marketplace revenue.
 *
 * @param {number} priceInSubunits deposit amount, from the listing's publicData
 * @param {string} currency
 * @returns {Array} lineItems
 */
exports.depositLineItems = (priceInSubunits, currency) => {
  return [
    {
      code: 'line-item/deposit',
      unitPrice: new Money(priceInSubunits, currency),
      quantity: 1,
      includeFor: ['customer', 'provider'],
    },
  ];
};
