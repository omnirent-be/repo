import React, { useState } from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { initiateIdentityVerification } from '../../../util/api';

import { Button, H4 } from '../../../components';

import css from './IdentityVerificationSection.module.css';

/**
 * Lets the current user start (or see the status of) an iDenfy identity
 * verification. See server/api/idenfy/*.js and
 * server/api-util/idenfy.js for the server side of this - it needs real
 * iDenfy credentials (IDENFY_API_KEY / IDENFY_API_SECRET) to actually work.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} [props.currentUser]
 * @returns {JSX.Element}
 */
const IdentityVerificationSection = props => {
  const { currentUser } = props;
  const [error, setError] = useState(null);
  const [inProgress, setInProgress] = useState(false);

  const identityVerification =
    currentUser?.attributes?.profile?.protectedData?.identityVerification;
  const status = identityVerification?.status;

  const handleVerify = () => {
    setInProgress(true);
    setError(null);
    initiateIdentityVerification()
      .then(({ redirectUrl }) => {
        window.location.href = redirectUrl;
      })
      .catch(e => {
        setInProgress(false);
        setError(e);
      });
  };

  return (
    <div className={css.root}>
      <H4 as="h3">
        <FormattedMessage id="IdentityVerificationSection.heading" />
      </H4>
      {status === 'approved' ? (
        <p className={css.statusApproved}>
          <FormattedMessage id="IdentityVerificationSection.statusApproved" />
        </p>
      ) : status === 'pending' ? (
        <p className={css.statusPending}>
          <FormattedMessage id="IdentityVerificationSection.statusPending" />
        </p>
      ) : (
        <>
          {status === 'denied' || status === 'suspected' ? (
            <p className={css.statusDenied}>
              <FormattedMessage id="IdentityVerificationSection.statusDenied" />
            </p>
          ) : (
            <p className={css.description}>
              <FormattedMessage id="IdentityVerificationSection.description" />
            </p>
          )}
          {error ? (
            <p className={css.error}>
              <FormattedMessage id="IdentityVerificationSection.error" />
            </p>
          ) : null}
          <Button onClick={handleVerify} inProgress={inProgress} className={css.submitButton}>
            <FormattedMessage id="IdentityVerificationSection.verifyButton" />
          </Button>
        </>
      )}
    </div>
  );
};

export default IdentityVerificationSection;
