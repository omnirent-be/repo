import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { Heading, ExternalLink } from '../../../components';
import { contractDownloadUrl } from '../../../util/api';

import css from './TransactionPanel.module.css';

// Link to the PDF rental agreement - only rendered once the booking has
// been accepted (see TransactionPage.js's showContractDownload), matching
// when server/api/contract.js actually has something to generate.
const ContractDownloadMaybe = props => {
  const { className, rootClassName, transactionId, showContractDownload } = props;
  const classes = classNames(rootClassName || css.contractDownloadContainer, className);

  if (!showContractDownload || !transactionId) {
    return null;
  }

  return (
    <div className={classes}>
      <Heading as="h3" rootClassName={css.sectionHeading}>
        <FormattedMessage id="TransactionPanel.contractDownloadHeading" />
      </Heading>
      <ExternalLink
        className={css.contractDownloadLink}
        href={contractDownloadUrl(transactionId.uuid || transactionId)}
      >
        <FormattedMessage id="TransactionPanel.contractDownloadLink" />
      </ExternalLink>
      <br />
      <ExternalLink
        className={css.contractDownloadLink}
        href={contractDownloadUrl(transactionId.uuid || transactionId, 'paper')}
      >
        <FormattedMessage id="TransactionPanel.contractDownloadPaperLink" />
      </ExternalLink>
    </div>
  );
};

export default ContractDownloadMaybe;
