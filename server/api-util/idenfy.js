const crypto = require('crypto');

// iDenfy identity verification (KYC) API - https://documentation.idenfy.com/
//
// Requires real credentials from an iDenfy account before any of this can
// actually work:
//   IDENFY_API_KEY       - from the iDenfy dashboard (API settings)
//   IDENFY_API_SECRET     - from the iDenfy dashboard (API settings)
//   IDENFY_WEBHOOK_SECRET - a separate signing secret you set yourself in
//                           the iDenfy dashboard under Settings > System
//                           notifications > (your webhook) > Headers, used
//                           to verify that webhook calls really come from
//                           iDenfy (see verifyWebhookSignature below).
// None of these are set yet in this project - see server/api/idenfy/*.js,
// which fail with a clear 500 error rather than silently pretending to
// work if they're missing.

const API_KEY = process.env.IDENFY_API_KEY;
const API_SECRET = process.env.IDENFY_API_SECRET;
const WEBHOOK_SECRET = process.env.IDENFY_WEBHOOK_SECRET;

const API_BASE_URL = 'https://ivs.idenfy.com/api/v2';

exports.isConfigured = () => !!(API_KEY && API_SECRET);
exports.isWebhookConfigured = () => !!WEBHOOK_SECRET;

const authHeader = () => {
  const encoded = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
  return `Basic ${encoded}`;
};

/**
 * Creates a new identification session ("token") for the given user.
 * See https://documentation.idenfy.com/KYC/GeneratingIdentificationToken/
 *
 * @param {Object} params
 * @param {string} params.clientId - Sharetribe user id (uuid string)
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} params.successUrl
 * @param {string} params.errorUrl
 * @param {string} params.unverifiedUrl
 * @param {string} [params.callbackUrl]
 * @returns {Promise<Object>} the parsed iDenfy response ({ authToken, redirectUrl, scanRef, ... })
 */
exports.createVerificationSession = async params => {
  if (!exports.isConfigured()) {
    const error = new Error(
      'iDenfy is not configured. Set IDENFY_API_KEY and IDENFY_API_SECRET.'
    );
    error.status = 500;
    throw error;
  }

  const { clientId, firstName, lastName, successUrl, errorUrl, unverifiedUrl, callbackUrl } =
    params;

  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      successUrl,
      errorUrl,
      unverifiedUrl,
      callbackUrl: callbackUrl || undefined,
      locale: 'en',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.message || 'iDenfy token creation failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Verifies the `Idenfy-Signature` header on an incoming webhook request.
 * MUST be called with the raw (unparsed) request body bytes - if the body
 * has already been parsed and re-serialized as JSON, the signature will
 * never match, even with the correct secret.
 * See https://documentation.idenfy.com/security/CallbackSigning/
 *
 * @param {Buffer} rawBody
 * @param {string} signatureHeader
 * @returns {boolean}
 */
exports.verifyWebhookSignature = (rawBody, signatureHeader) => {
  if (!WEBHOOK_SECRET || !signatureHeader || !rawBody) {
    return false;
  }
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
};
