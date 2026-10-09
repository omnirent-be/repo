// SendGrid Mail Send API - https://docs.sendgrid.com/api-reference/mail-send/mail-send
//
// Used for the public contact form (src/containers/ContactPage/ContactPage.js),
// which used to be a client-side `mailto:` link only (nothing sent or stored
// server-side, unreliable if the visitor has no mail client configured). See
// server/api/contact.js.
//
// Requires a real SendGrid account before any of this can actually work:
//   SENDGRID_API_KEY           - from the SendGrid dashboard (Settings > API Keys)
//   SENDGRID_CONTACT_FROM_EMAIL - a sender address verified in SendGrid
//                                 (Settings > Sender Authentication). SendGrid
//                                 rejects sends from an unverified address.
//   SENDGRID_CONTACT_TO_EMAIL  - optional, defaults to info@omnirent.be -
//                                 the inbox that should receive contact
//                                 messages.
// None of these are set yet in this project - server/api/contact.js fails
// with a clear 503 error rather than silently pretending to work if they're
// missing.

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_CONTACT_FROM_EMAIL;
const TO_EMAIL = process.env.SENDGRID_CONTACT_TO_EMAIL || 'info@omnirent.be';

const API_URL = 'https://api.sendgrid.com/v3/mail/send';

exports.isConfigured = () => !!(API_KEY && FROM_EMAIL);

/**
 * Sends the contact form's message to OmniRent's inbox via SendGrid.
 * `replyTo` is set to the visitor's own email, so replying to the
 * notification email goes straight back to them.
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.topicLabel - already-translated topic label, for a readable subject/body
 * @param {string} params.message
 * @returns {Promise<void>}
 */
exports.sendContactEmail = async params => {
  if (!exports.isConfigured()) {
    const error = new Error(
      'Contact form email is not configured. Set SENDGRID_API_KEY and SENDGRID_CONTACT_FROM_EMAIL.'
    );
    error.status = 503;
    throw error;
  }

  const { name, email, topicLabel, message } = params;
  const subject = `[Contactformulier${topicLabel ? ` - ${topicLabel}` : ''}] ${name}`;
  const text = `${message}\n\n—\nVan: ${name} <${email}>`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TO_EMAIL }] }],
      from: { email: FROM_EMAIL, name: 'OmniRent contactformulier' },
      reply_to: { email, name },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  });

  if (!response.ok) {
    // SendGrid returns an empty body on success (202) but a JSON error body
    // on failure - though not always, so this tolerates a non-JSON body
    // rather than throwing a confusing parse error on top of the real one.
    const data = await response.json().catch(() => null);
    const error = new Error(data?.errors?.[0]?.message || 'SendGrid request failed.');
    error.status = response.status;
    error.data = data;
    throw error;
  }
};
