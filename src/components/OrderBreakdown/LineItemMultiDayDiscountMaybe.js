import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_MULTI_DAY_DISCOUNT, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * The weekend-/multi-day rental discount (see
 * getMultiDayDiscountLineItemMaybe in server/api-util/lineItems.js and
 * weekendDiscountEnabled in EditListingPricingForm.js) as its own line
 * item - without this component it would fall into the generic
 * LineItemUnknownItemsMaybe instead of showing a clear label.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemMultiDayDiscountMaybe = props => {
  const { lineItems, intl } = props;

  const discountLineItem = lineItems.find(
    item => item.code === LINE_ITEM_MULTI_DAY_DISCOUNT && !item.reversal
  );

  return discountLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.multiDayDiscount" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, discountLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemMultiDayDiscountMaybe;
