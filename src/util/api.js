// These helpers are calling this template's own server-side routes
// so, they are not directly calling Marketplace API or Integration API.
// You can find these api endpoints from 'server/api/...' directory

import appSettings from '../config/settings';
import { types as sdkTypes, transit } from './sdkLoader';
import Decimal from 'decimal.js';

export const apiBaseUrl = marketplaceRootURL => {
  const port = process.env.REACT_APP_DEV_API_SERVER_PORT;
  const useDevApiServer = process.env.NODE_ENV === 'development' && !!port;

  // In development, the dev API server is running in a different port
  if (useDevApiServer) {
    return `http://localhost:${port}`;
  }

  // Otherwise, use the given marketplaceRootURL parameter or the same domain and port as the frontend
  return marketplaceRootURL ? marketplaceRootURL.replace(/\/$/, '') : `${window.location.origin}`;
};

// Application type handlers for JS SDK.
//
// NOTE: keep in sync with `typeHandlers` in `server/api-util/sdk.js`
export const typeHandlers = [
  // Use Decimal type instead of SDK's BigDecimal.
  {
    type: sdkTypes.BigDecimal,
    customType: Decimal,
    writer: v => new sdkTypes.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

const serialize = data => {
  return transit.write(data, { typeHandlers, verbose: appSettings.sdk.transitVerbose });
};

const deserialize = str => {
  return transit.read(str, { typeHandlers });
};

const methods = {
  POST: 'POST',
  GET: 'GET',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// If server/api returns data from SDK, you should set Content-Type to 'application/transit+json'
const request = (path, options = {}) => {
  const url = `${apiBaseUrl()}${path}`;
  const { credentials, headers, body, ...rest } = options;

  // If headers are not set, we assume that the body should be serialized as transit format.
  const shouldSerializeBody =
    (!headers || headers['Content-Type'] === 'application/transit+json') && body;
  const bodyMaybe = shouldSerializeBody ? { body: serialize(body) } : {};

  const fetchOptions = {
    credentials: credentials || 'include',
    // Since server/api mostly talks to Marketplace API using SDK,
    // we default to 'application/transit+json' as content type (as SDK uses transit).
    headers: headers || { 'Content-Type': 'application/transit+json' },
    ...bodyMaybe,
    ...rest,
  };

  return window.fetch(url, fetchOptions).then(res => {
    const contentTypeHeader = res.headers.get('Content-Type');
    const contentType = contentTypeHeader ? contentTypeHeader.split(';')[0] : null;

    if (res.status >= 400) {
      return res.json().then(data => {
        let e = new Error();
        e = Object.assign(e, data);

        throw e;
      });
    }
    if (contentType === 'application/transit+json') {
      return res.text().then(deserialize);
    } else if (contentType === 'application/json') {
      return res.json();
    }
    return res.text();
  });
};

// Keep the previous parameter order for the post method.
// For now, only POST has own specific function, but you can create more or use request directly.
const post = (path, body, options = {}) => {
  const requestOptions = {
    ...options,
    method: methods.POST,
    body,
  };

  return request(path, requestOptions);
};

// Fetch transaction line items from the local API endpoint.
//
// See `server/api/transaction-line-items.js` to see what data should
// be sent in the body.
export const transactionLineItems = body => {
  return post('/api/transaction-line-items', body);
};

// Initiate a privileged transaction.
//
// With privileged transitions, the transactions need to be created
// from the backend. This endpoint enables sending the order data to
// the local backend, and passing that to the Marketplace API.
//
// See `server/api/initiate-privileged.js` to see what data should be
// sent in the body.
export const initiatePrivileged = body => {
  return post('/api/initiate-privileged', body);
};

// Transition a transaction with a privileged transition.
//
// This is similar to the `initiatePrivileged` above. It will use the
// backend for the transition. The backend endpoint will add the
// payment line items to the transition params.
//
// See `server/api/transition-privileged.js` to see what data should
// be sent in the body.
export const transitionPrivileged = body => {
  return post('/api/transition-privileged', body);
};

// Request one or more extra days on an already accepted booking. Creates
// a separate, linked extra-day booking transaction (its own reservation
// and payment) priced automatically from the listing's own extra-day
// price (or its normal daily price as a fallback). The provider accepts
// or declines it directly on that transaction (a plain, non-privileged
// transition - see TransactionPage.duck.js's acceptExtraDay/declineExtraDay).
//
// See `server/api/extra-day/request.js` to see what data should be
// sent in the body.
export const requestExtraDay = body => {
  return post('/api/extra-day/request', body);
};

// Initiate the linked deposit-hold transaction for an accepted booking
// whose listing has a security deposit configured.
//
// See `server/api/deposit/initiate-hold.js` to see what data should be
// sent in the body.
export const initiateDepositHold = body => {
  return post('/api/deposit/initiate-hold', body);
};

// Provider releases (fully refunds to the customer) a held security
// deposit.
//
// See `server/api/deposit/release.js` to see what data should be sent
// in the body.
export const releaseDeposit = body => {
  return post('/api/deposit/release', body);
};

// Provider claims (fully pays out to themselves) a held security
// deposit.
//
// See `server/api/deposit/claim.js` to see what data should be sent in
// the body.
export const claimDeposit = body => {
  return post('/api/deposit/claim', body);
};

// Marks the current user's referral as converted (for the operator's manual
// payout report) if this is their first completed booking and they signed
// up via a referral link. Safe to call unconditionally after every
// checkout - it's a no-op otherwise.
//
// See `server/api/referral/mark-conversion.js`.
export const markReferralConversion = () => {
  return post('/api/referral/mark-conversion', {});
};

// URL for downloading the PDF rental agreement for a confirmed (accepted
// or later) booking transaction - not a fetch helper since this is meant
// to be used directly as a link href/window.location target, so the
// browser handles the file download itself.
//
// `mode: 'paper'` requests the variant meant to be printed and physically
// signed: it restores the blank paraaf lines on pages 1-5 instead of the
// default digital-confirmation line, since those lines would otherwise
// never actually get filled in (nobody signs a PDF viewed on screen with a
// pen). See `server/api/contract.js`.
export const contractDownloadUrl = (transactionId, mode) => {
  const query = mode ? `?mode=${mode}` : '';
  return `${apiBaseUrl()}/api/contract/${transactionId}${query}`;
};

// Starts an iDenfy identity verification session for the current user and
// returns { redirectUrl } - the caller should send the browser there.
//
// See `server/api/idenfy/initiate.js`. Requires IDENFY_API_KEY and
// IDENFY_API_SECRET to be configured server-side.
export const initiateIdentityVerification = () => {
  return post('/api/idenfy/initiate', {});
};

// Create user with identity provider (e.g. Facebook or Google)
//
// If loginWithIdp api call fails and user can't authenticate to Marketplace API with idp
// we will show option to create a new user with idp.
// For that user needs to confirm data fetched from the idp.
// After the confirmation, this endpoint is called to create a new user with confirmed data.
//
// See `server/api/auth/createUserWithIdp.js` to see what data should
// be sent in the body.
export const createUserWithIdp = body => {
  return post('/api/auth/create-user-with-idp', body);
};

// Check if user can be deleted and then delete the user. Endpoint logic
// must be modified to accommodate the transaction processes used in
// the marketplace.
export const deleteUserAccount = body => {
  return post('/api/delete-account', body);
};

// Sends the public contact form (src/containers/ContactPage/ContactPage.js)
// to OmniRent's inbox via SendGrid - see server/api/contact.js and
// server/api-util/sendgrid.js. Requires SENDGRID_API_KEY and
// SENDGRID_CONTACT_FROM_EMAIL to be configured server-side; the caller
// should fall back to a mailto: link if this rejects (e.g. not configured
// yet, or the request fails), so a visitor's message is never silently
// lost.
export const sendContactMessage = body => {
  return post('/api/contact', body);
};
