import React from 'react';

import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { pathByRouteName } from '../../../util/routes';
import { apiBaseUrl } from '../../../util/api';
import { SocialLoginButton } from '../../../components';

import { FacebookLogo, GoogleLogo, ItsmeMark } from './socialLoginLogos';
import css from './SocialLoginButtons.module.css';

/**
 * Renders social login buttons if at least one IdP is enabled.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isLogin - Whether login mode is active
 * @param {boolean} props.showFacebookLogin - Whether Facebook login is enabled
 * @param {boolean} props.showGoogleLogin - Whether Google login is enabled
 * @param {boolean} [props.showItsmeComingSoon] - Shows a disabled itsme button (scaffold - see socialLoginLogos.js's ItsmeMark)
 * @param {string} [props.from] - Return route after auth
 * @param {string} [props.userType] - Preselected user type
 * @param {'before'|'after'} [props.dividerPosition] - Where the "or" divider renders relative to the buttons
 * @param {string} [props.dividerMessageId] - Translation key for the divider text
 * @returns {JSX.Element|null}
 */
const SocialLoginButtons = props => {
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const {
    isLogin,
    showFacebookLogin,
    showGoogleLogin,
    showItsmeComingSoon = false,
    from,
    userType,
    dividerPosition = 'before',
    dividerMessageId = 'AuthenticationPage.or',
  } = props;
  const showSocialLogins = showFacebookLogin || showGoogleLogin || showItsmeComingSoon;

  const getDataForSSORoutes = () => {
    const baseUrl = apiBaseUrl();

    // Default route where user is returned after successfull authentication
    const defaultReturn = pathByRouteName('LandingPage', routeConfiguration);

    // Route for confirming user data before creating a new user
    const defaultConfirm = pathByRouteName('ConfirmPage', routeConfiguration);

    const queryParams = new URLSearchParams({
      ...(defaultReturn ? { defaultReturn } : {}),
      ...(defaultConfirm ? { defaultConfirm } : {}),
      // Route where the user should be returned after authentication
      // This is used e.g. with EditListingPage and ListingPage
      ...(from ? { from } : {}),
      // The preselected userType needs to be saved over the visit to identity provider's service
      ...(userType ? { userType } : {}),
    });

    return { baseUrl, queryParams: queryParams.toString() };
  };

  const authWithFacebook = () => {
    const { baseUrl, queryParams } = getDataForSSORoutes();
    window.location.href = `${baseUrl}/api/auth/facebook?${queryParams}`;
  };

  const authWithGoogle = () => {
    const { baseUrl, queryParams } = getDataForSSORoutes();
    window.location.href = `${baseUrl}/api/auth/google?${queryParams}`;
  };

  const facebookAuthenticationMessage = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.loginWithFacebook' })
    : intl.formatMessage({ id: 'AuthenticationPage.signupWithFacebook' });

  const googleAuthenticationMessage = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.loginWithGoogle' })
    : intl.formatMessage({ id: 'AuthenticationPage.signupWithGoogle' });

  const itsmeAuthenticationMessage = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.loginWithItsme' })
    : intl.formatMessage({ id: 'AuthenticationPage.signupWithItsme' });
  const itsmeComingSoonTitle = intl.formatMessage({ id: 'AuthenticationPage.itsmeComingSoonTitle' });

  const divider = (
    <div className={css.socialButtonsOr}>
      <span className={css.socialButtonsOrText}>
        <FormattedMessage id={dividerMessageId} />
      </span>
    </div>
  );

  const buttons = (
    <>
      {showFacebookLogin ? (
        <div className={css.socialButtonWrapper}>
          <SocialLoginButton onClick={() => authWithFacebook()}>
            <span className={css.buttonIcon}>
              <FacebookLogo ariaLabelledBy="facebook-authentication-msg" />
            </span>
            <span id="facebook-authentication-msg">{facebookAuthenticationMessage}</span>
          </SocialLoginButton>
        </div>
      ) : null}

      {showGoogleLogin ? (
        <div className={css.socialButtonWrapper}>
          <SocialLoginButton onClick={() => authWithGoogle()}>
            <span className={css.buttonIcon}>
              <GoogleLogo ariaLabelledBy="google-authentication-msg" />
            </span>
            <span id="google-authentication-msg">{googleAuthenticationMessage}</span>
          </SocialLoginButton>
        </div>
      ) : null}

      {showItsmeComingSoon ? (
        // Scaffold only: itsme needs a real OIDC partner account
        // (client id/secret) before this can do anything - see the
        // "Slimme Rol van itsme" section of the progressive-onboarding
        // spec. Shown disabled so the option is visible/expected without
        // promising something that doesn't work yet.
        <div className={css.socialButtonWrapper}>
          <SocialLoginButton disabled title={itsmeComingSoonTitle}>
            <span className={css.buttonIcon}>
              <ItsmeMark ariaLabelledBy="itsme-authentication-msg" />
            </span>
            <span id="itsme-authentication-msg">{itsmeAuthenticationMessage}</span>
            <span className={css.comingSoonTag}>
              <FormattedMessage id="AuthenticationPage.itsmeComingSoonTag" />
            </span>
          </SocialLoginButton>
        </div>
      ) : null}
    </>
  );

  return showSocialLogins ? (
    <div className={css.root}>
      {dividerPosition === 'before' ? divider : null}
      {buttons}
      {dividerPosition === 'after' ? divider : null}
    </div>
  ) : null;
};

export default SocialLoginButtons;
