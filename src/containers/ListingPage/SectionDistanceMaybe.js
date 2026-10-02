import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { obfuscatedCoordinates, userLocation } from '../../util/maps';
import {
  clearUserLocation,
  distanceInKm,
  estimateDriveMinutes,
  geocodePlace,
  getReachCategory,
  readUserLocation,
  saveUserLocation,
} from '../../util/userLocation';
import * as geocoderMapbox from '../../components/LocationAutocompleteInput/GeocoderMapbox';
import * as geocoderGoogleMaps from '../../components/LocationAutocompleteInput/GeocoderGoogleMaps';

import css from './SectionDistanceMaybe.module.css';

const getGeocoder = mapProvider => {
  const variant = mapProvider === 'googleMaps' ? geocoderGoogleMaps : geocoderMapbox;
  return new variant.default();
};

const formatKm = (intl, km) =>
  intl.formatNumber(km, { minimumFractionDigits: 0, maximumFractionDigits: km < 10 ? 1 : 0 });

/**
 * "Op 3,2 km van jou": how far this listing is from the visitor. Party gear is
 * only worth collecting when it is close, so this sits right under the
 * description. The visitor's location stays in their own browser.
 */
const SectionDistanceMaybe = props => {
  const { className, geolocation, publicData, listingId, mapsConfig, isOwnListing } = props;
  const intl = useIntl();

  const [mine, setMine] = useState(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | notFound | denied
  const inputRef = useRef(null);

  useEffect(() => {
    setMine(readUserLocation());
    setReady(true);
  }, []);

  if (!geolocation || isOwnListing || !ready) {
    return null;
  }

  const listingPoint = mapsConfig?.fuzzy?.enabled
    ? obfuscatedCoordinates(
        geolocation,
        mapsConfig.fuzzy.offset,
        listingId ? `${listingId.uuid}_${geolocation.lat}_${geolocation.lng}` : null
      )
    : geolocation;
  const city = publicData?.location?.address;

  const applyLocation = location => {
    saveUserLocation(location);
    setMine(location);
    setStatus('idle');
    setQuery('');
  };

  const onSubmit = async event => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setStatus('loading');
    try {
      const found = await geocodePlace(trimmed, getGeocoder(mapsConfig?.mapProvider));
      if (found) {
        applyLocation(found);
      } else {
        setStatus('notFound');
      }
    } catch (e) {
      setStatus('notFound');
    }
  };

  const onUseMyLocation = async () => {
    setStatus('loading');
    try {
      const latlng = await userLocation();
      applyLocation({
        lat: latlng.lat,
        lng: latlng.lng,
        label: intl.formatMessage({ id: 'SectionDistanceMaybe.currentLocation' }),
      });
    } catch (e) {
      setStatus('denied');
    }
  };

  const onChange = () => {
    clearUserLocation();
    setMine(null);
    setStatus('idle');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (mine) {
    const km = distanceInKm(mine, listingPoint);
    const minutes = estimateDriveMinutes(km);
    const reach = getReachCategory(minutes);
    return (
      <section className={classNames(css.root, css[reach], className)} aria-live="polite">
        <div className={css.pin} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              fill="currentColor"
              d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
            />
          </svg>
        </div>
        <div className={css.body}>
          <p className={css.headline}>
            <FormattedMessage id="SectionDistanceMaybe.distance" values={{ km: formatKm(intl, km) }} />
            {city ? (
              <span className={css.city}>
                <FormattedMessage id="SectionDistanceMaybe.inCity" values={{ city }} />
              </span>
            ) : null}
          </p>
          <p className={css.sub}>
            <span className={css.badge}>
              <FormattedMessage id={`SectionDistanceMaybe.reach.${reach}`} />
            </span>
            <FormattedMessage id="SectionDistanceMaybe.drive" values={{ minutes }} />
          </p>
          <p className={css.fine}>
            <FormattedMessage id="SectionDistanceMaybe.from" values={{ label: mine.label }} />{' '}
            <button type="button" className={css.link} onClick={onChange}>
              <FormattedMessage id="SectionDistanceMaybe.change" />
            </button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={classNames(css.root, className)}>
      <div className={css.pin} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
          />
        </svg>
      </div>
      <div className={css.body}>
        <p className={css.headline}>
          <FormattedMessage id="SectionDistanceMaybe.askTitle" />
        </p>
        <p className={css.sub}>
          <FormattedMessage id="SectionDistanceMaybe.askText" />
        </p>
        <form className={css.form} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            className={css.input}
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'SectionDistanceMaybe.placeholder' })}
            aria-label={intl.formatMessage({ id: 'SectionDistanceMaybe.placeholder' })}
          />
          <button type="submit" className={css.submit} disabled={status === 'loading'}>
            <FormattedMessage id="SectionDistanceMaybe.calculate" />
          </button>
        </form>
        <p className={css.fine}>
          <button type="button" className={css.link} onClick={onUseMyLocation}>
            <FormattedMessage id="SectionDistanceMaybe.useMyLocation" />
          </button>
        </p>
        {status === 'notFound' ? (
          <p className={css.error} role="alert">
            <FormattedMessage id="SectionDistanceMaybe.notFound" />
          </p>
        ) : null}
        {status === 'denied' ? (
          <p className={css.error} role="alert">
            <FormattedMessage id="SectionDistanceMaybe.denied" />
          </p>
        ) : null}
      </div>
    </section>
  );
};

export default SectionDistanceMaybe;
