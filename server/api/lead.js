const { sendLeadEmail } = require('../api-util/sendgrid');

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const PHONE_CHARS_RE = /^[+()0-9 -]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_LENGTHS = { name: 200, contact: 200, pageTitle: 200, pageUrl: 500 };

const isPhone = value => {
  const digitCount = (value.match(/[0-9]/g) || []).length;
  return digitCount >= 8 && PHONE_CHARS_RE.test(value);
};

/**
 * Landing page lead form (see src/containers/RentalLandingPage). Takes no Sharetribe
 * auth, anyone can ask for availability. Sends the lead to OmniRent's inbox via SendGrid.
 *
 * Body: { name, contact (phone or e-mail), date (YYYY-MM-DD), pageTitle, pageUrl?, website? }
 * `website` is a hidden honeypot field: bots fill it in, people do not.
 */
module.exports = (req, res) => {
  const { name, contact, date, pageTitle, pageUrl, website } = req.body || {};

  if (website) {
    // Looks like a bot. Pretend it worked, send nothing.
    res.status(200).json({ success: true });
    return;
  }
  if (typeof name !== 'string' || !name.trim() || name.length > MAX_LENGTHS.name) {
    res.status(400).json({ error: 'Missing or invalid "name".' });
    return;
  }
  const contactValue = typeof contact === 'string' ? contact.trim() : '';
  const contactIsEmail = EMAIL_RE.test(contactValue);
  if (!contactValue || contactValue.length > MAX_LENGTHS.contact) {
    res.status(400).json({ error: 'Missing or invalid "contact".' });
    return;
  }
  if (!contactIsEmail && !isPhone(contactValue)) {
    res.status(400).json({ error: 'Missing or invalid "contact".' });
    return;
  }
  if (typeof date !== 'string' || !DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    res.status(400).json({ error: 'Missing or invalid "date".' });
    return;
  }
  if (
    typeof pageTitle !== 'string' ||
    !pageTitle.trim() ||
    pageTitle.length > MAX_LENGTHS.pageTitle
  ) {
    res.status(400).json({ error: 'Missing or invalid "pageTitle".' });
    return;
  }
  if (pageUrl != null && (typeof pageUrl !== 'string' || pageUrl.length > MAX_LENGTHS.pageUrl)) {
    res.status(400).json({ error: 'Invalid "pageUrl".' });
    return;
  }

  return sendLeadEmail({
    name: name.trim(),
    contact: contactValue,
    contactIsEmail,
    date,
    pageTitle: pageTitle.trim(),
    pageUrl,
  })
    .then(() => {
      res.status(200).json({ success: true });
    })
    .catch(error => {
      // eslint-disable-next-line no-console
      console.error('Failed to send lead email:', error.message, error.data || '');
      res.status(error.status || 500).json({ error: error.message || 'Failed to send lead.' });
    });
};
