const { buildEvent, sendEvents } = require('../api-util/metaConversions');

let warnedNotConfigured = false;

/**
 * Forwards one browser Meta Pixel event to the Meta Conversions API (see
 * src/util/analytics.js trackMetaEvent). The browser sends the same event_id
 * to the Pixel, so Meta deduplicates the two.
 *
 * Fire-and-forget: always answers 204 and never blocks the page. Needs
 * REACT_APP_FACEBOOK_PIXEL_ID and META_CAPI_ACCESS_TOKEN; without them it does
 * nothing. META_CAPI_TEST_EVENT_CODE (optional) routes events to the "Test
 * events" tab in Meta Events Manager.
 *
 * Body: { eventName, eventId, eventSourceUrl, customData? }
 */
module.exports = (req, res) => {
  const pixelId = process.env.REACT_APP_FACEBOOK_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      // eslint-disable-next-line no-console
      console.warn(
        'Meta Conversions API events are not sent: REACT_APP_FACEBOOK_PIXEL_ID or META_CAPI_ACCESS_TOKEN is not set.'
      );
    }
    res.status(204).end();
    return;
  }

  const event = buildEvent({
    body: req.body,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    cookies: req.cookies,
  });

  if (event) {
    sendEvents({ pixelId, accessToken, testEventCode, events: [event] })
      .then(response => {
        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.warn(`Meta Conversions API responded with status ${response.status}.`);
        }
      })
      .catch(e => {
        // eslint-disable-next-line no-console
        console.warn(`Meta Conversions API request failed: ${e.message}`);
      });
  }

  res.status(204).end();
};
