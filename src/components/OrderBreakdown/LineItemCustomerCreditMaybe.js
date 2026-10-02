import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_CUSTOMER_CREDIT, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * A component that renders the customer's applied platform credit
 * (e.g. from the referral program) as a negative line item.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemCustomerCreditMaybe = props => {
  const { lineItems, intl } = props;

  const creditLineItem = lineItems.find(
    item => item.code === LINE_ITEM_CUSTOMER_CREDIT && !item.reversal
  );

  return creditLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.customerCredit" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, creditLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemCustomerCreditMaybe;
