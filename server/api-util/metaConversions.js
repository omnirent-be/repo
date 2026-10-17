const GRAPH_API_VERSION = 'v21.0';

// Only Standard Events we actually send from the client. Anything else is
// rejected so this public endpoint cannot be used to push arbitrary events
// into the pixel.
const ALLOWED_EVENT_NAMES = [
  'PageView',
  'ViewContent',
  'Search',
  'InitiateCheckout',
  'Lead',
  'CompleteRegistration',
  'Contact',
];

const MAX_URL_LENGTH = 2000;
const MAX_CUSTOM_DATA_KEYS = 20;
const MAX_CUSTOM_DATA_VALUE_LENGTH = 200;

const isNonEmptyString = value => typeof value === 'string' && value.length > 0;

const cleanCustomData = customData => {
  if (!customData || typeof customData !== 'object' || Array.isArray(customData)) {
    return {};
  }
  return Object.keys(customData)
    .slice(0, MAX_CUSTOM_DATA_KEYS)
    .reduce((result, key) => {
      const value = customData[key];
      if (typeof value === 'string') {
        result[key] = value.slice(0, MAX_CUSTOM_DATA_VALUE_LENGTH);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        result[key] = value;
      }
      return result;
    }, {});
};

const isHttpUrl = value => {
  if (!isNonEmptyString(value) || value.length > MAX_URL_LENGTH) {
    return false;
  }
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch (e) {
    return false;
  }
};

/**
 * Builds one Conversions API event from a client request, or returns null
 * when the request is not a valid, allowed event. The same `event_id` as the
 * browser Pixel call is used so Meta can deduplicate the two.
 *
 * @param {Object} params
 * @param {Object} params.body - Request body: { eventName, eventId, eventSourceUrl, customData }
 * @param {string} [params.ip] - Visitor IP address
 * @param {string} [params.userAgent] - Visitor user agent
 * @param {Object} [params.cookies] - Request cookies (reads Meta's `_fbp` and `_fbc`)
 * @param {number} [params.nowSeconds] - Current Unix time in seconds (for tests)
 * @returns {Object|null} Conversions API event data
 */
const buildEvent = ({ body, ip, userAgent, cookies, nowSeconds }) => {
  const { eventName, eventId, eventSourceUrl, customData } = body || {};
  if (!ALLOWED_EVENT_NAMES.includes(eventName)) {
    return null;
  }
  if (!isNonEmptyString(eventId) || eventId.length > 100) {
    return null;
  }
  if (!isHttpUrl(eventSourceUrl)) {
    return null;
  }

  const userData = {};
  if (ip) {
    userData.client_ip_address = ip;
  }
  if (userAgent) {
    userData.client_user_agent = userAgent;
  }
  if (isNonEmptyString(cookies?._fbp)) {
    userData.fbp = cookies._fbp;
  }
  if (isNonEmptyString(cookies?._fbc)) {
    userData.fbc = cookies._fbc;
  }

  return {
    event_name: eventName,
    event_time: nowSeconds || Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: eventSourceUrl,
    action_source: 'website',
    user_data: userData,
    custom_data: cleanCustomData(customData),
  };
};

/**
 * Sends events to the Meta Conversions API. The access token is only ever
 * read from the environment and never logged.
 *
 * @param {Object} params
 * @param {string} params.pixelId
 * @param {string} params.accessToken
 * @param {string} [params.testEventCode]
 * @param {Object[]} params.events
 * @returns {Promise<Response>}
 */
const sendEvents = ({ pixelId, accessToken, testEventCode, events }) => {
  const payload = { data: events };
  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }
  return fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
};

module.exports = { ALLOWED_EVENT_NAMES, buildEvent, sendEvents };
