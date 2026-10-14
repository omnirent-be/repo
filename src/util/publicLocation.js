const POSTCODE_RE = /\b\d{4,5}\b/g;

/**
 * Reduces a full listing address to the place name that may be shown publicly, for example
 * "Brusselsesteenweg 329, 9050 Gent, Oost-Vlaanderen, België" becomes "Gent". The street,
 * house number and postcode are dropped so a listing never gives away where someone lives.
 * The exact address is only shared after a booking is accepted (see the TransactionPage).
 *
 * @param {string} address address as stored in `publicData.location.address`
 * @returns {string|null} place name, or null when nothing safe to show remains
 */
export const getPublicPlaceName = address => {
  if (typeof address !== 'string') {
    return null;
  }
  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const hasDigit = part => /\d/.test(part);
  // The first part of a multi-part address is the street (with house number).
  const withoutStreet = parts.length > 1 && hasDigit(parts[0]) ? parts.slice(1) : parts;
  // A part like "Brusselsesteenweg" without a number is also a street when more parts follow.
  const candidates = parts.length > 1 && !hasDigit(parts[0]) ? parts.slice(1) : withoutStreet;

  const place = candidates
    .map(part =>
      part
        .replace(POSTCODE_RE, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .find(part => part.length > 0 && !hasDigit(part));

  return place || null;
};
