// The visitor's own location, kept in this browser only. Used to show how far
// a listing is ("Op 3,2 km van jou"). Nothing is sent to our servers.
const STORAGE_KEY = 'omnirent.userLocation';

export const readUserLocation = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number' ? parsed : null;
  } catch (e) {
    return null;
  }
};

export const saveUserLocation = location => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (e) {
    // Storage can be blocked: the location then only lives for this page view.
  }
};

export const clearUserLocation = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
};

const toRadians = degrees => (degrees * Math.PI) / 180;

// Straight-line distance in km (haversine).
export const distanceInKm = (a, b) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
};

// Rough drive time by car. Roads are about 30% longer than the straight line,
// and average speed is lower in town than on the motorway. It is an estimate,
// not a route calculation.
export const estimateDriveMinutes = straightKm => {
  const roadKm = straightKm * 1.3;
  const averageKmh = roadKm < 15 ? 35 : 55;
  return Math.max(1, Math.round((roadKm / averageKmh) * 60));
};

// Party equipment is only worth picking up when it is close by.
export const getReachCategory = minutes => {
  if (minutes <= 15) {
    return 'near';
  }
  if (minutes <= 30) {
    return 'reachable';
  }
  return 'far';
};

// Belgian postcode or town name -> coordinates, with the geocoder of the
// configured map provider.
export const geocodePlace = async (query, geocoder) => {
  const { predictions } = await geocoder.getPlacePredictions(query, ['BE'], 'nl', [
    'postcode',
    'place',
    'locality',
  ]);
  const first = predictions?.[0];
  if (!first) {
    return null;
  }
  const place = await geocoder.getPlaceDetails(first);
  const origin = place?.origin;
  if (!origin) {
    return null;
  }
  const parts = (place.address || query).split(',').map(part => part.trim());
  // "9000, Gent, Oost-Vlaanderen, België" -> "9000 Gent"
  const label = /^\d{4}$/.test(parts[0]) && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0];
  return { lat: origin.lat, lng: origin.lng, label };
};
