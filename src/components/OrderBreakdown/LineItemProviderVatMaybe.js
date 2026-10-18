import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_PROVIDER_VAT, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * Renders the VAT a company-type provider owes on their own price, added to
 * what the customer pays and passed straight through to the provider (who
 * remits it themselves - this is never OmniRent's own revenue). Only
 * present at all when the provider is registered as a company.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemProviderVatMaybe = props => {
  const { lineItems, intl } = props;

  const vatLineItem = lineItems.find(item => item.code === LINE_ITEM_PROVIDER_VAT && !item.reversal);

  // `percentage` comes from the SDK as a decimal.js Decimal instance (see
  // `typeHandlers` in src/util/api.js), not a plain number - passing it
  // straight into FormattedMessage's `values` renders that object as a React
  // child and crashes. Unwrap it first.
  const percentage =
    vatLineItem?.percentage && typeof vatLineItem.percentage === 'object'
      ? vatLineItem.percentage.toString()
      : vatLineItem?.percentage;

  return vatLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.providerVat" values={{ percentage }} />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, vatLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemProviderVatMaybe;
