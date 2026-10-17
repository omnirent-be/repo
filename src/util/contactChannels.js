// Direct contact channels for the conversion landing pages. Phone, WhatsApp and the response
// promise are public business details that are not known in the code, so they are set per
// environment (see .env-template); the matching buttons only show when they are set.
// Instagram and Facebook are the existing OmniRent accounts (also used on the contact page).

const INSTAGRAM_USERNAME = 'omnirent.be';
const FACEBOOK_PAGE_ID = '61590675847159';

const onlyDigits = value => (value || '').replace(/\D/g, '');

/**
 * @param {string} phone phone number in any common format, e.g. "+32 471 23 45 67"
 * @returns {string|null} tel: link, or null when no phone number is given
 */
export const buildPhoneHref = phone => {
  const digits = onlyDigits(phone);
  if (!digits) {
    return null;
  }
  return `tel:${(phone || '').trim().startsWith('+') ? '+' : ''}${digits}`;
};

/**
 * @param {string} number WhatsApp number in international format, e.g. "+32471234567"
 * @param {string} message message the chat opens with
 * @returns {string|null} click-to-chat link, or null when no number is given
 */
export const buildWhatsAppHref = (number, message) => {
  const digits = onlyDigits(number).replace(/^00/, '');
  if (!digits) {
    return null;
  }
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
};

/**
 * Contact channels that are available in this environment.
 *
 * @param {string} whatsAppMessage message the WhatsApp chat opens with
 * @returns {{phoneHref: string|null, phoneLabel: string|null, whatsAppHref: string|null,
 *   instagramHref: string, messengerHref: string, responsePromise: string|null}}
 */
export const getContactChannels = whatsAppMessage => {
  const phone = process.env.REACT_APP_CONTACT_PHONE;
  const whatsAppNumber = process.env.REACT_APP_WHATSAPP_NUMBER;
  const responsePromise = process.env.REACT_APP_RESPONSE_PROMISE;

  return {
    phoneHref: buildPhoneHref(phone),
    phoneLabel: phone ? phone.trim() : null,
    whatsAppHref: buildWhatsAppHref(whatsAppNumber, whatsAppMessage),
    instagramHref: `https://ig.me/m/${INSTAGRAM_USERNAME}`,
    messengerHref: `https://m.me/${FACEBOOK_PAGE_ID}`,
    responsePromise: responsePromise ? responsePromise.trim() : null,
  };
};
