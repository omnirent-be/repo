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

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

/**
 * The location text shown publicly for a listing: the nearest sub-municipality (deelgemeente)
 * with its municipality, for example "Gentbrugge, Gent". Uses the neighborhood and city saved
 * with the listing (see GeocoderMapbox.js `extractLocationLabelParts`). For listings saved
 * before that existed it falls back to the city, and then to the place name in the address.
 * It never contains a street, house number or postcode.
 *
 * @param {Object} location `publicData.location`
 * @param {string} [location.neighborhood]
 * @param {string} [location.city]
 * @param {string} [location.address]
 * @returns {string|null}
 */
export const getPublicLocationLabel = location => {
  const { neighborhood, city, address } = location || {};
  const area = typeof neighborhood === 'string' ? neighborhood.trim() : '';
  const town = typeof city === 'string' ? city.trim() : '';

  if (area) {
    const repeatsTown =
      town && (sameName(area, town) || area.toLowerCase().startsWith(`${town.toLowerCase()} `));
    return town && !repeatsTown ? `${area}, ${town}` : area;
  }
  return town || getPublicPlaceName(address);
};

const AREA_CACHE_PREFIX = 'omnirent_area_';

const readCachedArea = key => {
  try {
    return JSON.parse(window.sessionStorage.getItem(key));
  } catch (e) {
    return null;
  }
};

const writeCachedArea = (key, value) => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Storage can be unavailable (private mode); the lookup then simply repeats.
  }
};

/**
 * Looks up the sub-municipality and municipality of a point with the Mapbox reverse geocoding
 * API. Only the two names are kept, the coordinates are not stored anywhere. The result is
 * cached in the browser session.
 *
 * @param {Object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {string} params.accessToken Mapbox access token
 * @returns {Promise<{neighborhood: string|null, city: string|null}|null>}
 */
export const fetchAreaNames = async ({ lat, lng, accessToken }) => {
  if (typeof window === 'undefined' || !accessToken || lat == null || lng == null) {
    return null;
  }
  const cacheKey = `${AREA_CACHE_PREFIX}${lat.toFixed(4)}_${lng.toFixed(4)}`;
  const cached = readCachedArea(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?types=locality,neighborhood,place&language=nl&access_token=${accessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const { features = [] } = await response.json();
    const find = types => features.find(f => types.includes(f.place_type?.[0]))?.text || null;
    const result = { neighborhood: find(['locality', 'neighborhood']), city: find(['place']) };
    if (!result.neighborhood && !result.city) {
      return null;
    }
    writeCachedArea(cacheKey, result);
    return result;
  } catch (e) {
    return null;
  }
};
