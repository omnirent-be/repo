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

  return vatLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.providerVat" values={{ percentage: vatLineItem.percentage }} />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, vatLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemProviderVatMaybe;
