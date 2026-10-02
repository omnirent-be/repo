import { types as sdkTypes } from '../../util/sdkLoader';
import { userLocation } from '../../util/maps';

const { LatLng: SDKLatLng, LatLngBounds: SDKLatLngBounds } = sdkTypes;

export const CURRENT_LOCATION_ID = 'current-location';

const GENERATED_BOUNDS_DEFAULT_DISTANCE = 500; // meters
// Distances for generated bounding boxes for different Mapbox place types
const PLACE_TYPE_BOUNDS_DISTANCES = {
  address: 500,
  country: 2000,
  region: 2000,
  postcode: 2000,
  district: 2000,
  place: 2000,
  locality: 2000,
  neighborhood: 2000,
  poi: 2000,
  'poi.landmark': 2000,
};

const locationBounds = (latlng, distance) => {
  if (!latlng) {
    return null;
  }

  const bounds = new window.mapboxgl.LngLat(latlng.lng, latlng.lat).toBounds(distance);
  return new SDKLatLngBounds(
    new SDKLatLng(bounds.getNorth(), bounds.getEast()),
    new SDKLatLng(bounds.getSouth(), bounds.getWest())
  );
};

const placeOrigin = prediction => {
  if (prediction && Array.isArray(prediction.center) && prediction.center.length === 2) {
    // Coordinates in Mapbox features are represented as [longitude, latitude].
    return new SDKLatLng(prediction.center[1], prediction.center[0]);
  }
  return null;
};

const placeBounds = prediction => {
  if (prediction) {
    if (Array.isArray(prediction.bbox) && prediction.bbox.length === 4) {
      // Bounds in Mapbox features are represented as [minX, minY, maxX, maxY]
      return new SDKLatLngBounds(
        new SDKLatLng(prediction.bbox[3], prediction.bbox[2]),
        new SDKLatLng(prediction.bbox[1], prediction.bbox[0])
      );
    } else {
      // If bounds are not available, generate them around the origin

      // Resolve bounds distance based on place type
      const placeType = Array.isArray(prediction.place_type) && prediction.place_type[0];

      const distance =
        (placeType && PLACE_TYPE_BOUNDS_DISTANCES[placeType]) || GENERATED_BOUNDS_DEFAULT_DISTANCE;

      return locationBounds(placeOrigin(prediction), distance);
    }
  }
  return null;
};

export const GeocoderAttribution = () => null;

// Pulls a readable "postcode - wijk" label's raw parts out of a Mapbox
// feature's context array (each entry looks like {id: 'postcode.123',
// text: '9000'}). Used to save a privacy-safe location label - see
// EditListingDeliveryPanel.js - alongside the exact address, so the public
// search page can show e.g. "9000 Gent - Ledeberg" without ever exposing the
// street/house number.
const extractLocationLabelParts = prediction => {
  const context = prediction?.context || [];
  const findText = idPrefix => context.find(c => c.id?.startsWith(idPrefix))?.text || null;
  return {
    postalCode: findText('postcode.'),
    city: findText('place.'),
    neighborhood: findText('neighborhood.') || findText('locality.'),
  };
};

// Mapbox's own `countries` request param is a soft bias, not a hard filter:
// for address-level results near a border, it still returns matches from
// the neighboring country (e.g. searching "eupen" returns German addresses
// on "Eupener Straße" even with countries: ['BE']). Filter predictions
// ourselves against each feature's country context as a hard guarantee.
const matchesCountryLimit = (prediction, countryLimit) => {
  if (!countryLimit || countryLimit.length === 0) {
    return true;
  }
  const allowedCodes = countryLimit.map(code => code.toLowerCase());

  if (prediction.place_type?.includes('country')) {
    const countryCode = prediction.properties?.short_code?.toLowerCase();
    return !countryCode || allowedCodes.includes(countryCode);
  }

  const countryContext = (prediction.context || []).find(c => c.id?.startsWith('country.'));
  return !!countryContext && allowedCodes.includes(countryContext.short_code?.toLowerCase());
};

/**
 * A forward geocoding (place name -> coordinates) implementation
 * using the Mapbox Geocoding API.
 */
class GeocoderMapbox {
  getClient() {
    const libLoaded = typeof window !== 'undefined' && window.mapboxgl && window.mapboxSdk;
    if (!libLoaded) {
      throw new Error('Mapbox libraries are required for GeocoderMapbox');
    }
    if (!this._client && window?.mapboxgl?.accessToken) {
      this._client = window.mapboxSdk({
        accessToken: window.mapboxgl.accessToken,
      });
    }
    return this._client;
  }

  // Public API
  //

  /**
   * Search places with the given name.
   *
   * @param {String} search query for place names
   *
   * @return {Promise<{ search: String, predictions: Array<Object>}>}
   * results of the geocoding, should have the original search query
   * and an array of predictions. The format of the predictions is
   * only relevant for the `getPlaceDetails` function below.
   */
  getPlacePredictions(search, countryLimit, locale, placeTypes) {
    const limitCountriesMaybe = countryLimit ? { countries: countryLimit } : {};
    // Some fields (e.g. a listing's city) only need a city/town result, not a
    // full street address - callers can restrict results to specific Mapbox
    // place types (e.g. ['place', 'locality']) via placeTypes.
    const limitTypesMaybe = placeTypes ? { types: placeTypes } : {};
    // Mapbox's max is 10. Ask for more than the 5 we show, since some may
    // get dropped by the country-context filter below (see matchesCountryLimit).
    const requestLimit = countryLimit ? 10 : 5;

    return this.getClient()
      .geocoding.forwardGeocode({
        query: search,
        limit: requestLimit,
        ...limitCountriesMaybe,
        ...limitTypesMaybe,
        language: [locale],
      })
      .send()
      .then(response => {
        const predictions = response.body.features
          .filter(prediction => matchesCountryLimit(prediction, countryLimit))
          .slice(0, 5);
        return {
          search,
          predictions,
        };
      });
  }

  /**
   * Get the ID of the given prediction.
   */
  getPredictionId(prediction) {
    return prediction.id;
  }

  /**
   * Get the address text of the given prediction.
   */
  getPredictionAddress(prediction) {
    if (prediction.predictionPlace) {
      // default prediction defined above
      return prediction.predictionPlace.address;
    }
    // prediction from Mapbox geocoding API
    return prediction.place_name;
  }

  /**
   * Fetch or read place details from the selected prediction.
   *
   * @param {Object} prediction selected prediction object
   *
   * @return {Promise<util.propTypes.place>} a place object
   */
  getPlaceDetails(prediction, currentLocationBoundsDistance) {
    if (this.getPredictionId(prediction) === CURRENT_LOCATION_ID) {
      return userLocation().then(latlng => {
        return {
          address: '',
          origin: latlng,
          bounds: locationBounds(latlng, currentLocationBoundsDistance),
        };
      });
    }

    if (prediction.predictionPlace) {
      return Promise.resolve(prediction.predictionPlace);
    }

    return Promise.resolve({
      address: this.getPredictionAddress(prediction),
      origin: placeOrigin(prediction),
      bounds: placeBounds(prediction),
      ...extractLocationLabelParts(prediction),
    });
  }
}

export default GeocoderMapbox;
