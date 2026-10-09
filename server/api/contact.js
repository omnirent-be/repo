const { sendContactEmail } = require('../api-util/sendgrid');

// Same pattern as src/util/validators.js's EMAIL_RE - kept separate since
// this is the only server-side file that needs it, and the client already
// validates the field before it ever gets submitted (this is a second,
// defensive check, not the user-facing one).
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const MAX_LENGTHS = { name: 200, email: 200, topicLabel: 100, message: 5000 };

// Public contact form submit - see src/containers/ContactPage/ContactPage.js
// and server/api-util/sendgrid.js. Deliberately takes no Sharetribe SDK/auth:
// anyone, logged in or not, should be able to reach OmniRent this way.
module.exports = (req, res) => {
  const { name, email, topicLabel, message } = req.body || {};

  if (typeof name !== 'string' || !name.trim() || name.length > MAX_LENGTHS.name) {
    res.status(400).json({ error: 'Missing or invalid "name".' });
    return;
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email) || email.length > MAX_LENGTHS.email) {
    res.status(400).json({ error: 'Missing or invalid "email".' });
    return;
  }
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_LENGTHS.message) {
    res.status(400).json({ error: 'Missing or invalid "message".' });
    return;
  }
  if (topicLabel != null && (typeof topicLabel !== 'string' || topicLabel.length > MAX_LENGTHS.topicLabel)) {
    res.status(400).json({ error: 'Invalid "topicLabel".' });
    return;
  }

  return sendContactEmail({
    name: name.trim(),
    email: email.trim(),
    topicLabel,
    message: message.trim(),
  })
    .then(() => {
      res.status(200).json({ success: true });
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error('Failed to send contact form email:', error.message, error.data || '');
      res.status(error.status || 500).json({ error: error.message || 'Failed to send message.' });
    });
};
