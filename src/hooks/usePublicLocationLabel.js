import { useEffect, useState } from 'react';

import { fetchAreaNames, getPublicLocationLabel } from '../util/publicLocation';

/**
 * The public location text of a listing, for example "Gentbrugge, Gent": the nearest
 * sub-municipality, never the street address. It starts with what is saved on the listing
 * (so it also works for server rendering). For listings saved without a sub-municipality it
 * looks it up in the browser from the listing's coordinates with Mapbox.
 *
 * @param {Object} params
 * @param {Object} params.location `publicData.location` of the listing
 * @param {Object} params.geolocation listing coordinates {lat, lng}
 * @param {Object} params.mapsConfig `config.maps`
 * @returns {string|null}
 */
const usePublicLocationLabel = ({ location, geolocation, mapsConfig }) => {
  const [lookedUp, setLookedUp] = useState(null);

  const accessToken = mapsConfig?.mapProvider === 'mapbox' ? mapsConfig?.mapboxAccessToken : null;
  const needsLookup = !location?.neighborhood && !!geolocation && !!accessToken;
  const lat = geolocation?.lat;
  const lng = geolocation?.lng;

  useEffect(() => {
    if (!needsLookup) {
      return undefined;
    }
    let cancelled = false;
    fetchAreaNames({ lat, lng, accessToken }).then(names => {
      if (!cancelled && names) {
        setLookedUp(getPublicLocationLabel({ ...location, ...names }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [needsLookup, lat, lng, accessToken]);

  return lookedUp || getPublicLocationLabel(location);
};

export default usePublicLocationLabel;
