import React, { useState } from 'react';

import { useConfiguration } from '../../../../context/configurationContext';
import { useRouteConfiguration } from '../../../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { pathByRouteName } from '../../../../util/routes';
import { isSignupEmailTakenError } from '../../../../util/errors';

import { Modal, Heading } from '../../../../components';
import { getHandleSubmitSignup } from '../../../AuthenticationPage/AuthenticationPage.helpers';
import TermsAndConditions from '../../../AuthenticationPage/TermsAndConditions/TermsAndConditions';
import SignupForm from '../../../AuthenticationPage/SignupForm/SignupForm';
import LoginForm from '../../../AuthenticationPage/LoginForm/LoginForm';

import css from './CompleteAccountModal.module.css';

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
 * "List First, Sign Up Later": shown when an anonymous visitor tries to
 * submit the Basics step of the listing wizard (see EditListingBasicsForm.js).
 * Deliberately does NOT offer Google/Facebook login here - those navigate
 * away from the page, which would lose the buffered (not-yet-uploaded)
 * photo files sitting in the form's local state. Email/password only, so
 * the whole flow stays in-page and nothing the provider already filled in
 * is lost.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onManageDisableScrolling
 * @param {boolean} props.isAuthenticated
 * @param {Function} props.onSignup
 * @param {Function} props.onLogin
 * @param {boolean} props.signupInProgress
 * @param {propTypes.error} [props.signupError]
 * @param {boolean} props.loginInProgress
 * @param {propTypes.error} [props.loginError]
 * @param {Function} props.onAuthenticated - Called once signup/login succeeds
 * @returns {JSX.Element}
 */
const CompleteAccountModal = props => {
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
      id="EditListingBasicsForm.completeAccount"
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <div className={css.root}>
        <Heading as="h2" rootClassName={css.heading}>
          <FormattedMessage id="EditListingBasicsForm.completeAccountModal.title" />
        </Heading>
        <p className={css.subtitle}>
          <FormattedMessage id="EditListingBasicsForm.completeAccountModal.subtitle" />
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
              <FormattedMessage id="EditListingBasicsForm.completeAccountModal.hasAccount" />{' '}
              <button type="button" className={css.switchModeLink} onClick={() => setMode('login')}>
                <FormattedMessage id="EditListingBasicsForm.completeAccountModal.loginLink" />
              </button>
            </p>
          </>
        ) : (
          <>
            <LoginForm className={css.form} onSubmit={handleLogin} inProgress={loginInProgress} />
            <p className={css.switchMode}>
              <FormattedMessage id="EditListingBasicsForm.completeAccountModal.noAccount" />{' '}
              <button type="button" className={css.switchModeLink} onClick={() => setMode('signup')}>
                <FormattedMessage id="EditListingBasicsForm.completeAccountModal.signupLink" />
              </button>
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CompleteAccountModal;
