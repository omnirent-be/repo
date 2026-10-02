const postalCodeCoordinates = require('./data/belgianPostalCodeCoordinates.json');

// Straight-line ("as the crow flies") distance in km between two
// {lat, lng} points - deliberately not a real driving-route distance (that
// would need a routing API/extra cost), just a reasonable approximation
// for a per-km delivery fee estimate.
const EARTH_RADIUS_KM = 6371;
const toRadians = degrees => (degrees * Math.PI) / 180;

const haversineDistanceKm = (a, b) => {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
};

// Belgian postal code -> approximate centroid coordinates, bundled from
// GeoNames' public-domain BE postal code dataset (download.geonames.org).
// Deliberately a static, bundled lookup rather than a live geocoding API
// call: no external service, no per-request cost or latency, and it's all
// this marketplace needs since it only operates in Belgium.
const coordinatesForPostalCode = postalCode => {
  const normalized = (postalCode || '').trim();
  const entry = postalCodeCoordinates[normalized];
  return entry ? { lat: entry[0], lng: entry[1] } : null;
};

/**
 * Estimates the straight-line delivery distance (km) between a listing's
 * own location and a customer's delivery address, for per-km delivery
 * pricing (see getDeliveryLineItems in lineItems.js).
 *
 * Returns null whenever the distance can't be determined yet - missing
 * listing geolocation, an address outside Belgium (the bundled postal code
 * data only covers BE), or a postal code we don't recognize. Callers treat
 * that as "no delivery fee to show yet", not an error - the checkout page
 * re-requests a price as soon as the customer finishes typing their
 * address (see CheckoutPageWithPayment.js).
 *
 * @param {Object} params
 * @param {{lat: number, lng: number}|null} params.listingGeolocation
 * @param {string} [params.postalCode]
 * @param {string} [params.country] - ISO 3166-1 alpha-2, e.g. 'BE'
 * @returns {number|null} distance in km, rounded to 1 decimal
 */
const estimateDeliveryDistanceKm = ({ listingGeolocation, postalCode, country }) => {
  if (!listingGeolocation || country !== 'BE') {
    return null;
  }
  const destination = coordinatesForPostalCode(postalCode);
  if (!destination) {
    return null;
  }
  const km = haversineDistanceKm(listingGeolocation, destination);
  return Math.round(km * 10) / 10;
};

module.exports = { haversineDistanceKm, estimateDeliveryDistanceKm };
