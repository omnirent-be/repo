const { getSdk, handleError } = require('../../api-util/sdk');
const { getRootURL } = require('../../api-util/rootURL');
const { createVerificationSession, isConfigured } = require('../../api-util/idenfy');

// Starts an identity verification session for the current user and
// returns the URL to redirect them to (iDenfy's hosted verification flow).
module.exports = (req, res) => {
  if (!isConfigured()) {
    res.status(500).json({
      error:
        'Identity verification is not configured yet. IDENFY_API_KEY and IDENFY_API_SECRET need to be set.',
    });
    return;
  }

  const sdk = getSdk(req, res);
  const rootUrl = getRootURL();

  sdk.currentUser
    .show()
    .then(response => {
      const currentUser = response.data.data;
      const { firstName, lastName } = currentUser.attributes.profile;

      return createVerificationSession({
        clientId: currentUser.id.uuid,
        firstName,
        lastName,
        successUrl: `${rootUrl}/account/manage?idenfy=success`,
        errorUrl: `${rootUrl}/account/manage?idenfy=error`,
        unverifiedUrl: `${rootUrl}/account/manage?idenfy=unverified`,
      }).then(session => {
        // Record that a verification is in progress. The final result only
        // arrives later via the webhook (server/api/idenfy/callback.js),
        // once real iDenfy credentials + a publicly reachable webhook URL
        // are configured - see server/api-util/idenfy.js.
        return sdk.currentUser
          .updateProfile({
            protectedData: {
              identityVerification: {
                status: 'pending',
                scanRef: session.scanRef,
                requestedAt: new Date().toISOString(),
              },
            },
          })
          .then(() => session);
      });
    })
    .then(session => {
      res.status(200).json({ redirectUrl: session.redirectUrl });
    })
    .catch(e => {
      handleError(res, e);
    });
};
