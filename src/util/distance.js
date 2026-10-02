// Great-circle distance between two lat/lng points, in kilometers.
// Good enough for "how far is this rental" at city scale - not meant for
// routing/driving distance.
const EARTH_RADIUS_KM = 6371;
const toRadians = deg => (deg * Math.PI) / 180;

export const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

// "650 m" under 1km, "2,4 km" otherwise (comma - Dutch decimal separator).
export const formatDistanceKm = distanceKm => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
};
