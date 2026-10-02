import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';

import css from './TransactionPanel.module.css';

const { Money } = sdkTypes;

const depositStatusMessageId = status => {
  switch (status) {
    case 'held':
      return 'BookingExtrasSummary.depositHeld';
    case 'released':
      return 'BookingExtrasSummary.depositReleased';
    case 'claimed':
      return 'BookingExtrasSummary.depositClaimed';
    default:
      return null;
  }
};

const extraDayStatusMessageId = (status, isCustomer) => {
  switch (status) {
    case 'payment_initiated':
      return 'BookingExtrasSummary.extraDayPaymentInitiated';
    case 'requested':
      return isCustomer
        ? 'BookingExtrasSummary.extraDayRequestedCustomer'
        : 'BookingExtrasSummary.extraDayRequestedProvider';
    case 'accepted':
      return 'BookingExtrasSummary.extraDayAccepted';
    case 'declined':
      return 'BookingExtrasSummary.extraDayDeclined';
    case 'expired':
      return 'BookingExtrasSummary.extraDayExpired';
    default:
      return null;
  }
};

/**
 * Persistent, always-visible summary of the deposit and extra-day
 * sub-status for a booking - so a customer/provider can see at a glance
 * whether a deposit is held or an extra day is awaiting action, without
 * having to scroll through the activity feed to piece it together.
 *
 * @component
 */
const BookingExtrasSummary = props => {
  const { className, rootClassName, protectedData, listing, isCustomer, currency, intl } = props;
  const { extraDay, deposit } = protectedData || {};
  const depositInSubunits = listing?.attributes?.publicData?.depositInSubunits;

  const needsDepositPayment = isCustomer && !!depositInSubunits && !deposit;
  const depositMessageId = depositStatusMessageId(deposit?.status);
  const extraDayMessageId = extraDayStatusMessageId(extraDay?.status, isCustomer);

  const rows = [];

  if (extraDayMessageId) {
    rows.push(
      <div key="extraDay" className={css.bookingExtraRow}>
        <FormattedMessage id={extraDayMessageId} />
      </div>
    );
  }

  if (needsDepositPayment && depositInSubunits) {
    const depositAmount = formatMoney(intl, new Money(depositInSubunits, currency));
    rows.push(
      <div key="deposit" className={css.bookingExtraRow}>
        <FormattedMessage id="BookingExtrasSummary.depositDue" values={{ depositAmount }} />
      </div>
    );
  } else if (depositMessageId) {
    rows.push(
      <div key="deposit" className={css.bookingExtraRow}>
        <FormattedMessage id={depositMessageId} />
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  const classes = classNames(rootClassName || css.bookingExtras, className);

  return <div className={classes}>{rows}</div>;
};

export default BookingExtrasSummary;
