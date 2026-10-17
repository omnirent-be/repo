const log = require('../../log.js');
const { authErrorCookieOptions } = require('../../api-util/cookieOptions');

const rootUrl = (process.env.REACT_APP_MARKETPLACE_ROOT_URL || '').replace(/\/+$/, '');

/**
 * Respond to a social login request for a provider whose client id is not configured.
 * Instead of a 500 error page, the user is sent back to the login page with an error message.
 *
 * @param {Object} res Express response object
 * @param {String} provider Identity provider id, e.g. 'google' or 'facebook'
 */
const respondProviderNotConfigured = (res, provider) => {
  log.error(
    new Error(`Social login with ${provider} is not configured`),
    'idp-provider-not-configured'
  );

  return res
    .cookie(
      'st-autherror',
      {
        status: 'Service Unavailable',
        code: 503,
        message: `Login with ${provider} is not available.`,
      },
      authErrorCookieOptions()
    )
    .redirect(`${rootUrl}/login#`);
};

module.exports = { respondProviderNotConfigured };
