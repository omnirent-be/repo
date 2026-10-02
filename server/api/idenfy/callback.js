const { verifyWebhookSignature, isWebhookConfigured } = require('../../api-util/idenfy');

// iDenfy calls this URL directly (server-to-server, no browser session) once
// a verification finishes. See https://documentation.idenfy.com/
//
// IMPORTANT: this route is mounted with bodyParser.raw() in apiRouter.js so
// req.body is a raw Buffer here, not parsed JSON - the signature check
// needs the exact original bytes (see verifyWebhookSignature).
//
// KNOWN GAP: writing the result onto the user's profile needs an
// operator-level write to a user OTHER than the one making the request -
// that's not something the regular Marketplace API (the SDK used
// everywhere else in this app) can do. It requires the separate Sharetribe
// **Integration API** (its own credentials, from Console > Advanced >
// Applications > "Integration API", and the `sharetribe-flex-integration-sdk`
// package, which isn't installed here). Everything up to that point
// (signature verification, parsing the result) is fully implemented below;
// applyVerificationResult() is the one place left to wire up once those
// credentials exist.
const applyVerificationResult = async ({ clientId, scanRef, status }) => {
  throw new Error(
    'applyVerificationResult is not implemented: writing iDenfy results onto a ' +
      'user\'s profile requires Sharetribe Integration API credentials, which are ' +
      'not configured. See the comment at the top of server/api/idenfy/callback.js.'
  );
};

module.exports = (req, res) => {
  if (!isWebhookConfigured()) {
    console.error('Received an iDenfy webhook, but IDENFY_WEBHOOK_SECRET is not set.');
    res.status(500).end();
    return;
  }

  const signature = req.get('Idenfy-Signature');
  const rawBody = req.body; // Buffer, see bodyParser.raw() in apiRouter.js

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Rejected an iDenfy webhook call with an invalid signature.');
    res.status(401).end();
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    console.error('Failed to parse iDenfy webhook body as JSON.', e);
    res.status(400).end();
    return;
  }

  const { clientId, scanRef, status } = payload;

  applyVerificationResult({ clientId, scanRef, status })
    .then(() => {
      res.status(200).end();
    })
    .catch(e => {
      // Log loudly - iDenfy will retry failed webhooks, but a silent 200
      // here would make a real, missing-credentials failure invisible.
      console.error('Failed to process iDenfy webhook:', e.message);
      res.status(500).end();
    });
};
