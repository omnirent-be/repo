import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { getProcess, resolveLatestProcessName } from '../../../transactions/transaction';

import { Heading } from '../../../components';
import {
  QuoteProgress,
  QuoteRequestSummary,
} from '../../../components/QuoteSystem/QuoteSystem';
import { userDisplayNameAsString } from '../../../util/data';

import css from './RequestQuote.module.css';

// Functional component as a helper to build ActivityFeed section
const RequestQuote = props => {
  const {
    className,
    rootClassName,
    transaction,
    transactionRole,
    isNegotiationProcess,
    isCustomerBanned,
    intl,
    transactionFieldsComponent,
    processState,
  } = props;

  if (!isNegotiationProcess) {
    return null;
  }

  const isCustomer = transactionRole === 'customer';
  const protectedData = transaction?.attributes?.protectedData;
  const customerDefaultMessage = !isCustomerBanned
    ? protectedData?.customerDefaultMessage
    : intl.formatMessage({ id: 'TransactionPage.messageSenderBanned' });

  const processName = resolveLatestProcessName(transaction?.attributes?.processName);
  let process = null;
  try {
    process = processName ? getProcess(processName) : null;
  } catch (error) {
    // Process was not recognized!
    return null;
  }

  const otherParty = isCustomer ? transaction?.provider : transaction?.customer;
  const otherPartyName = userDisplayNameAsString(otherParty, '');

  const classes = classNames(rootClassName || css.container, className);
  return (
    <>
      <QuoteProgress
        processState={processState}
        transactionRole={transactionRole}
        otherPartyName={otherPartyName}
      />
      <QuoteRequestSummary protectedData={protectedData} />
      {customerDefaultMessage ? (
        <div className={classes}>
          <Heading as="h2" rootClassName={css.sectionHeading}>
            <FormattedMessage id="TransactionPage.RequestQuote.heading" />
          </Heading>

          {transactionFieldsComponent}
        </div>
      ) : null}
    </>
  );
};

export default RequestQuote;
