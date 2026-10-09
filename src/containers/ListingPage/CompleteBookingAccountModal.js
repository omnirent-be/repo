import React, { useState } from 'react';

import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import { isSignupEmailTakenError } from '../../util/errors';

import { Modal, Heading } from '../../components';
import { getHandleSubmitSignup } from '../AuthenticationPage/AuthenticationPage.helpers';
import TermsAndConditions from '../AuthenticationPage/TermsAndConditions/TermsAndConditions';
import SignupForm from '../AuthenticationPage/SignupForm/SignupForm';
import LoginForm from '../AuthenticationPage/LoginForm/LoginForm';

import css from './CompleteBookingAccountModal.module.css';

const AuthErrorMessage = ({ mode, loginError, signupError }) => {
  const translationId =
    mode === 'login' && !!loginError
      ? 'AuthenticationPage.loginFailed'
      : mode === 'signup' && !!signupError && isSignupEmailTakenError(signupError)
      ? 'AuthenticationPage.signupFailedEmailAlreadyTaken'
      : mode === 'signup' && !!signupError
      ? 'AuthenticationPage.signupFailed'
      : null;
  return translationId ? (
    <div className={css.error}>
      <FormattedMessage id={translationId} />
    </div>
  ) : null;
};

/**
 * "Vraag eerst aan, maak dan pas een account aan": shown when an anonymous
 * visitor submits the booking form on ListingPage (BookingDatesForm etc. via
 * OrderPanel). Replaces the old behaviour of hard-redirecting straight to
 * the signup page the instant "Boeking aanvragen" was clicked, which a UX
 * review flagged as the #1 source of drop-off - a first-time visitor had no
 * idea their chosen dates would even be kept.
 *
 * The dates/quantity/etc. the visitor already picked are NOT lost either
 * way: ListingPage.shared.js's handleSubmit already saves orderData to
 * sessionStorage whenever there's no currentUser, and CheckoutPage restores
 * it from there once the visitor is authenticated and lands back there. This
 * modal's own job is narrower - staying in place on the listing page instead
 * of navigating away at all, and being explicit about *why* an account is
 * needed right here, rather than relying on a generic signup page to explain
 * it after the fact.
 *
 * Deliberately email/password only (no Google/Facebook), same reasoning as
 * EditListingBasicsForm's CompleteAccountModal: a social-login redirect
 * would navigate away from this page, and there'd be no page left to resume
 * the booking submit on when the visitor comes back.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onSignup
 * @param {Function} props.onLogin
 * @param {boolean} props.signupInProgress
 * @param {propTypes.error} [props.signupError]
 * @param {boolean} props.loginInProgress
 * @param {propTypes.error} [props.loginError]
 * @param {Function} props.onAuthenticated - Called once signup/login succeeds, to replay the buffered booking submit
 * @returns {JSX.Element}
 */
const CompleteBookingAccountModal = props => {
  const {
    isOpen,
    onClose,
    onManageDisableScrolling,
    onSignup,
    onLogin,
    signupInProgress,
    signupError,
    loginInProgress,
    loginError,
    onAuthenticated,
  } = props;
  const [mode, setMode] = useState('signup');
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();

  const { userTypes = [], userFields = [] } = config.user;

  const handleSignup = params => {
    return onSignup(params)
      .then(() => onAuthenticated())
      .catch(() => {
        // signupError (read from Redux) already drives the inline message.
      });
  };
  const handleLogin = ({ email, password }) => {
    return onLogin(email, password)
      .then(() => onAuthenticated())
      .catch(() => {
        // loginError (read from Redux) already drives the inline message.
      });
  };

  const openInNewTab = routeName => () => {
    const path = pathByRouteName(routeName, routeConfiguration);
    if (typeof window !== 'undefined') {
      window.open(path, '_blank', 'noopener,noreferrer');
    }
  };
  const termsAndConditions = (
    <TermsAndConditions
      onOpenTermsOfService={openInNewTab('TermsOfServicePage')}
      onOpenPrivacyPolicy={openInNewTab('PrivacyPolicyPage')}
      intl={intl}
    />
  );

  return (
    <Modal
      id="ListingPage.completeBookingAccount"
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <div className={css.root}>
        <Heading as="h2" rootClassName={css.heading}>
          <FormattedMessage id="CompleteBookingAccountModal.title" />
        </Heading>
        <p className={css.subtitle}>
          <FormattedMessage id="CompleteBookingAccountModal.subtitle" />
        </p>

        <AuthErrorMessage mode={mode} loginError={loginError} signupError={signupError} />

        {mode === 'signup' ? (
          <>
            <SignupForm
              className={css.form}
              onSubmit={getHandleSubmitSignup({ submitSignup: handleSignup, userFields, userTypes })}
              inProgress={signupInProgress}
              termsAndConditions={termsAndConditions}
              preselectedUserType={null}
              userTypes={userTypes}
              userFields={userFields}
            />
            <p className={css.switchMode}>
              <FormattedMessage id="CompleteBookingAccountModal.hasAccount" />{' '}
              <button type="button" className={css.switchModeLink} onClick={() => setMode('login')}>
                <FormattedMessage id="CompleteBookingAccountModal.loginLink" />
              </button>
            </p>
          </>
        ) : (
          <>
            <LoginForm className={css.form} onSubmit={handleLogin} inProgress={loginInProgress} />
            <p className={css.switchMode}>
              <FormattedMessage id="CompleteBookingAccountModal.noAccount" />{' '}
              <button type="button" className={css.switchModeLink} onClick={() => setMode('signup')}>
                <FormattedMessage id="CompleteBookingAccountModal.signupLink" />
              </button>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CompleteBookingAccountModal;
