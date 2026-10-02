/**
 * Sharetribe Integration API client - the only way to read data across ALL
 * users rather than just the one currently authenticated (e.g. the referral
 * admin report, which needs to see who referred whom). This requires a
 * separate "Integration" application, created in Sharetribe Console under
 * Build -> Applications -> Add new -> Integration application. Regular
 * Marketplace API credentials (REACT_APP_SHARETRIBE_SDK_CLIENT_ID /
 * SHARETRIBE_SDK_CLIENT_SECRET) do NOT grant this access.
 *
 * Until SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET are set, isIntegrationSdkConfigured()
 * returns false and callers should degrade gracefully (see admin-report.js).
 */
let integrationSdk = null;

const isIntegrationSdkConfigured = () =>
  !!process.env.SHARETRIBE_INTEGRATION_CLIENT_ID && !!process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

const getIntegrationSdk = () => {
  if (!isIntegrationSdkConfigured()) {
    return null;
  }
  if (!integrationSdk) {
    // eslint-disable-next-line global-require
    const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');
    integrationSdk = sharetribeIntegrationSdk.createInstance({
      clientId: process.env.SHARETRIBE_INTEGRATION_CLIENT_ID,
      clientSecret: process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET,
    });
  }
  return integrationSdk;
};

module.exports = { getIntegrationSdk, isIntegrationSdkConfigured };
