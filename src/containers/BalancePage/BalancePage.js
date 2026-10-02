import React, { useMemo } from 'react';
import Decimal from 'decimal.js';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { types as sdkTypes } from '../../util/sdkLoader';
import { formatMoney } from '../../util/currency';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';

import { H3, Page, LayoutSingleColumn, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './BalancePage.module.css';

const { Money } = sdkTypes;

const totalPayout = transactions => {
  const withPayout = transactions.filter(tx => !!tx.attributes.payoutTotal);
  if (withPayout.length === 0) {
    return null;
  }
  const currency = withPayout[0].attributes.payoutTotal.currency;
  const sum = withPayout.reduce(
    (total, tx) => total.plus(tx.attributes.payoutTotal.amount),
    new Decimal(0)
  );
  return new Money(sum.toNumber(), currency);
};

/**
 * BalancePage - a read-only overview of a provider's earnings, computed
 * directly from their own Sharetribe sale transactions (payoutTotal per
 * transaction). This intentionally does NOT hold, move, or let anyone
 * deposit/withdraw funds: Stripe (via Sharetribe's transaction process)
 * remains the only party that ever holds money. Actual payout timing and
 * bank transfer status can be checked in the connected Stripe account.
 *
 * @component
 * @returns {JSX.Element}
 */
export const BalancePageComponent = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const { transactionRefs, queryInProgress, queryEarningsError } = useSelector(
    state => state.BalancePage
  );
  const transactions = useSelector(state => getMarketplaceEntities(state, transactionRefs));

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (a, b) => new Date(b.attributes.lastTransitionedAt) - new Date(a.attributes.lastTransitionedAt)
      ),
    [transactions]
  );

  const total = useMemo(() => totalPayout(transactions), [transactions]);
  const hasTransactions = sortedTransactions.length > 0;
  const isLoaded = !queryInProgress && !queryEarningsError;

  return (
    <Page
      title={intl.formatMessage({ id: 'BalancePage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="BalancePage.heading" />
          </H3>

          <p className={css.disclaimer}>
            <FormattedMessage id="BalancePage.disclaimer" />
          </p>

          {queryInProgress ? (
            <p className={css.messagePanel}>
              <FormattedMessage id="BalancePage.loading" />
            </p>
          ) : queryEarningsError ? (
            <p className={css.messagePanel}>
              <FormattedMessage id="BalancePage.queryError" />
            </p>
          ) : (
            <>
              <div className={css.totalCard}>
                <span className={css.totalLabel}>
                  <FormattedMessage id="BalancePage.totalLabel" />
                </span>
                <span className={css.totalAmount}>
                  {total ? formatMoney(intl, total) : '–'}
                </span>
              </div>

              {isLoaded && !hasTransactions ? (
                <p className={css.messagePanel}>
                  <FormattedMessage id="BalancePage.noResults" />
                </p>
              ) : (
                <ul className={css.transactionList}>
                  {sortedTransactions.map(tx => {
                    const listing = tx.listing;
                    const title = listing?.attributes?.title;
                    const amount = tx.attributes.payoutTotal
                      ? formatMoney(intl, tx.attributes.payoutTotal)
                      : '–';
                    return (
                      <li key={tx.id.uuid} className={css.transactionRow}>
                        <span className={css.transactionTitle}>{title}</span>
                        <span className={css.transactionState}>{tx.attributes.lastTransition}</span>
                        <span className={css.transactionAmount}>{amount}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          <NamedLink className={css.stripeLink} name="StripePayoutPage">
            <FormattedMessage id="BalancePage.stripeLink" />
          </NamedLink>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default BalancePageComponent;
