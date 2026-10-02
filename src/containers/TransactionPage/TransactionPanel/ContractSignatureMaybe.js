import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { userDisplayNameAsString } from '../../../util/data';
import { isContractSignatureMessage, parseContractSignatureName } from '../../../util/contractSignature';
import { SecondaryButton, IconSpinner } from '../../../components';

import css from './TransactionPanel.module.css';

// Finds the current user's own most recent signature among the
// transaction's messages, if any - mirrors
// server/api-util/contractSignature.js's findSignatures (same marker
// format), just scoped to "me" since that's all a signing UI needs.
const findOwnSignature = (messages, currentUserId) => {
  const own = (messages || [])
    .filter(m => isContractSignatureMessage(m.attributes?.content))
    .filter(m => m.sender?.id?.uuid && currentUserId && m.sender.id.uuid === currentUserId)
    .sort((a, b) => new Date(a.attributes.createdAt) - new Date(b.attributes.createdAt));
  const latest = own[own.length - 1];
  if (!latest) {
    return null;
  }
  const name = parseContractSignatureName(latest.attributes.content);
  return name ? { name, signedAt: latest.attributes.createdAt } : null;
};

// Lets the current viewer place their own e-signature on the rental
// contract - implemented as a specially-marked chat message (see
// src/util/contractSignature.js for why), so it shows up automatically in
// the generated PDF next time it's downloaded (see ContractDownloadMaybe).
const ContractSignatureMaybe = props => {
  const {
    className,
    rootClassName,
    transactionId,
    showContractDownload,
    currentUser,
    messages,
    onSignContract,
    sendMessageInProgress,
  } = props;
  const intl = useIntl();
  const classes = classNames(rootClassName || css.contractDownloadContainer, className);

  const [name, setName] = useState(() => userDisplayNameAsString(currentUser, ''));
  const [justSigned, setJustSigned] = useState(false);

  if (!showContractDownload || !transactionId || !onSignContract) {
    return null;
  }

  const existingSignature = findOwnSignature(messages, currentUser?.id?.uuid);
  const signature = justSigned || existingSignature;

  const handleSign = () => {
    const trimmedName = name.trim();
    if (!trimmedName || sendMessageInProgress) {
      return;
    }
    // The dispatched thunk resolves either way (fulfilled or rejected
    // action) rather than rejecting the promise, so check requestStatus
    // explicitly instead of relying on .catch().
    onSignContract(trimmedName).then(resp => {
      if (resp?.meta?.requestStatus === 'fulfilled') {
        setJustSigned(true);
      }
      // On failure, sendMessageError (already wired up for the regular
      // message form) surfaces the problem - nothing extra needed here.
    });
  };

  return (
    <div className={classes}>
      {signature ? (
        <p className={css.contractSignatureConfirmed}>
          <FormattedMessage
            id="ContractSignatureMaybe.signed"
            values={{
              name: existingSignature?.name || name.trim(),
            }}
          />
        </p>
      ) : (
        <div className={css.contractSignatureForm}>
          <label htmlFor="contractSignatureName" className={css.contractSignatureLabel}>
            <FormattedMessage id="ContractSignatureMaybe.heading" />
          </label>
          <div className={css.contractSignatureRow}>
            <input
              id="contractSignatureName"
              className={css.contractSignatureInput}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'ContractSignatureMaybe.namePlaceholder' })}
            />
            <SecondaryButton
              type="button"
              className={css.contractSignatureButton}
              onClick={handleSign}
              disabled={!name.trim() || sendMessageInProgress}
            >
              {sendMessageInProgress ? (
                <IconSpinner className={css.contractSignatureSpinner} />
              ) : (
                <FormattedMessage id="ContractSignatureMaybe.signButton" />
              )}
            </SecondaryButton>
          </div>
          <span className={css.contractSignatureHint}>
            <FormattedMessage id="ContractSignatureMaybe.hint" />
          </span>
        </div>
      )}
    </div>
  );
};

export default ContractSignatureMaybe;
