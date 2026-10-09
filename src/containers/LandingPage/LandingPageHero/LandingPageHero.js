import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { formatMoney } from '../../../util/currency';
import { displayPrice } from '../../../util/configHelpers';
import { isBookingProcessAlias } from '../../../transactions/transaction';
import { NamedLink, UnifiedSearchForm } from '../../../components';
import { createSlug } from '../../../util/urlHelpers';
import { fetchRecentActivityThunk } from '../../../ducks/recentActivity.duck';
import { fetchListingsCountThunk } from '../../../ducks/listingsCount.duck';
import { fetchHeroPhotosThunk } from '../../../ducks/heroPhotos.duck';

import css from './LandingPageHero.module.css';

// The same background photo already uploaded for the (now code-replaced)
// hosted "hero" section - reused here as a real image instead of a stock
// photo, via its public Sharetribe/imgix asset URL.
const HERO_IMAGE_URL =
  'https://sharetribe-assets.imgix.net/690e87ec-9691-4079-a358-055499ede745/raw/97/472bbb898252d3b7b3b7643b18e12aa5a69e57?auto=format&fit=clip&h=3600&w=3600&s=bdc4507b62b00facd299ecf7dc8b81a3';

const TRUST_ITEMS_RENT = ['secure', 'noObligation', 'payAfterAcceptance'];

const PHOTO_ROTATE_MS = 5000;

// Shown instead of real activity whenever there are fewer than
// MIN_REAL_ACTIVITY_ITEMS real (non-test) ones - a ticker with 1-2 real
// items would undersell activity more than it builds confidence. Swapped
// out automatically once real, non-test activity passes the threshold.
const MIN_REAL_ACTIVITY_ITEMS = 10;
const FALLBACK_ACTIVITY = [
  {
    id: 'fallback-1',
    node: <FormattedMessage id="LandingPageHero.activityTicker.fallback.bbq" />,
    time: { id: 'justNow' },
  },
  {
    id: 'fallback-2',
    node: <FormattedMessage id="LandingPageHero.activityTicker.fallback.partytent" />,
    time: { id: 'minutesAgo', minutes: 12 },
  },
  {
    id: 'fallback-3',
    node: <FormattedMessage id="LandingPageHero.activityTicker.fallback.tapbar" />,
    time: { id: 'minutesAgo', minutes: 34 },
  },
  {
    id: 'fallback-4',
    node: <FormattedMessage id="LandingPageHero.activityTicker.fallback.bouncyCastle" />,
    time: { id: 'hoursAgo', hours: 1 },
  },
  {
    id: 'fallback-5',
    node: <FormattedMessage id="LandingPageHero.activityTicker.fallback.wineBarrels" />,
    time: { id: 'hoursAgo', hours: 2 },
  },
];

// Real photos from real listings, cross-fading in the same frame the static
// fallback photo used to occupy. Falls back to the fixed photo when no
// listing has a usable image yet (e.g. a brand new marketplace), so the
// hero is never empty.
const HeroPhoto = () => {
  const dispatch = useDispatch();
  const intl = useIntl();
  const config = useConfiguration();
  const [photos, setPhotos] = useState(null); // null = still loading
  const [index, setIndex] = useState(0);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Request photos cropped to the same aspect ratio the frame renders at
  // (the site-wide listing image ratio, e.g. 4/3) - so the server crop and
  // the CSS `object-fit: cover` crop agree instead of fighting each other.
  const [aspectWidth, aspectHeight] = (config.layout.listingImage.aspectRatio || '1/1')
    .split('/')
    .map(Number);
  const aspectRatio = aspectHeight / aspectWidth;

  useEffect(() => {
    dispatch(fetchHeroPhotosThunk({ aspectRatio }))
      .unwrap()
      .then(setPhotos)
      .catch(() => setPhotos([]));
  }, []);

  useEffect(() => {
    if (!photos || photos.length < 2 || prefersReducedMotion) {
      return undefined;
    }
    const timer = setInterval(() => {
      setIndex(current => (current + 1) % photos.length);
    }, PHOTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [photos, prefersReducedMotion]);

  const usingFallback = !photos || photos.length === 0;
  const slides = usingFallback
    ? [{ id: 'fallback', url: HERO_IMAGE_URL, url2x: null, alt: '' }]
    : photos;
  const showDots = !usingFallback && slides.length > 1;

  const goToPrevious = () => setIndex(current => (current - 1 + slides.length) % slides.length);
  const goToNext = () => setIndex(current => (current + 1) % slides.length);

  const priceBadgeFor = slide => {
    if (!slide.price) {
      return null;
    }
    const { publicData = {} } = slide;
    const listingTypeConfig = config.listing.listingTypes.find(
      conf => conf.listingType === publicData.listingType
    );
    if (!displayPrice(listingTypeConfig) || slide.price.currency !== config.currency) {
      return null;
    }
    const isBookable = isBookingProcessAlias(publicData.transactionProcessAlias);
    const perUnit = isBookable
      ? intl.formatMessage({ id: 'ListingCard.perUnit' }, { unitType: publicData.unitType })
      : '';
    return { formattedPrice: formatMoney(intl, slide.price), perUnit };
  };

  return (
    <>
      {slides.map((slide, slideIndex) => {
        const isActive = usingFallback || slideIndex === index;
        const price = usingFallback ? null : priceBadgeFor(slide);
        const img = (
          <img
            className={css.heroImage}
            src={slide.url}
            srcSet={slide.url2x ? `${slide.url} 1x, ${slide.url2x} 2x` : undefined}
            alt=""
            role="presentation"
          />
        );

        // Real listing photos link through to that listing - a way to
        // discover it, not just decoration. The fallback photo isn't a real
        // listing, so it stays a plain image.
        return usingFallback ? (
          <div
            key={slide.id}
            className={classNames(css.heroSlide, { [css.heroSlideActive]: isActive })}
          >
            {img}
          </div>
        ) : (
          <NamedLink
            key={slide.id}
            name="ListingPage"
            params={{ id: slide.id, slug: createSlug(slide.alt) }}
            className={classNames(css.heroSlide, css.heroSlideLink, {
              [css.heroSlideActive]: isActive,
            })}
          >
            {img}
            <span className={css.featuredBadge}>
              <FormattedMessage id="LandingPageHero.featured" />
            </span>
            <span className={css.viewListingCta}>
              <span className={css.viewListingTitle}>{slide.alt}</span>
              {price ? (
                <>
                  <span className={css.viewListingDivider} aria-hidden="true" />
                  <span className={css.viewListingPrice}>
                    <FormattedMessage
                      id="LandingPageHero.viewListingPriceFrom"
                      values={{
                        price: `${price.formattedPrice}${price.perUnit ? ` ${price.perUnit}` : ''}`,
                      }}
                    />
                  </span>
                </>
              ) : null}
              <svg className={css.viewListingArrow} viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 4l6 6-6 6"
                />
              </svg>
            </span>
          </NamedLink>
        );
      })}
      {showDots ? (
        <>
          <button
            type="button"
            className={classNames(css.heroArrow, css.heroArrowPrev)}
            aria-label={intl.formatMessage({ id: 'LandingPageHero.previousPhoto' })}
            onClick={goToPrevious}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 4l-6 6 6 6"
              />
            </svg>
          </button>
          <button
            type="button"
            className={classNames(css.heroArrow, css.heroArrowNext)}
            aria-label={intl.formatMessage({ id: 'LandingPageHero.nextPhoto' })}
            onClick={goToNext}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 4l6 6-6 6"
              />
            </svg>
          </button>
        </>
      ) : null}
      {showDots ? (
        <div className={css.photoDots} role="tablist" aria-label="Uitgelichte foto's">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={intl.formatMessage(
                { id: 'LandingPageHero.photoDot' },
                { current: slideIndex + 1, total: slides.length }
              )}
              className={classNames(css.photoDot, {
                [css.photoDotActive]: slideIndex === index,
              })}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
};

// "X min geleden" / "Xu geleden" from an ISO date - deliberately coarse
// (minutes/hours only) since this is a trust-building glance, not a precise
// timestamp.
const relativeTimeLabel = isoDate => {
  if (!isoDate) {
    return null;
  }
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));
  if (diffMinutes < 2) {
    return { id: 'justNow' };
  }
  if (diffMinutes < 60) {
    return { id: 'minutesAgo', minutes: diffMinutes };
  }
  return { id: 'hoursAgo', hours: Math.round(diffMinutes / 60) };
};

const ActivityTimeLabel = ({ time }) => {
  if (!time) {
    return null;
  }
  if (time.id === 'justNow') {
    return <FormattedMessage id="LandingPageHero.activityTicker.timeJustNow" />;
  }
  if (time.id === 'minutesAgo') {
    return (
      <FormattedMessage
        id="LandingPageHero.activityTicker.timeMinutesAgo"
        values={{ minutes: time.minutes }}
      />
    );
  }
  return (
    <FormattedMessage id="LandingPageHero.activityTicker.timeHoursAgo" values={{ hours: time.hours }} />
  );
};

// Realtime social-proof strip right under the hero. Prefers real, recent
// listing activity over the curated fallback copy, but only once there's
// enough of it (MIN_REAL_ACTIVITY_ITEMS) to not look sparse. Test/seed
// listings are excluded upstream in recentActivity.duck.js.
//
// Mobile gets one static item (no animation, no marquee) rather than the
// scrolling ticker - a moving strip is harder to read at that width and
// risks horizontal overflow; viewportMedium and up get the full marquee,
// which pauses on hover/focus so it's actually readable rather than just
// decorative. The outer root has a fixed height from the first render (the
// fallback copy renders immediately, before the real-activity fetch
// resolves), so swapping in real items never causes a layout shift.
const ActivityTicker = () => {
  const dispatch = useDispatch();
  const [realItems, setRealItems] = useState([]);

  useEffect(() => {
    dispatch(fetchRecentActivityThunk())
      .unwrap()
      .then(setRealItems)
      .catch(() => setRealItems([]));
  }, []);

  const useFallback = realItems.length < MIN_REAL_ACTIVITY_ITEMS;
  const items = useFallback
    ? FALLBACK_ACTIVITY
    : realItems.map(item => ({
        id: item.id,
        node: (
          <FormattedMessage
            id="Topbar.activityTicker.item"
            values={{ name: item.authorName, title: item.title }}
          />
        ),
        time: relativeTimeLabel(item.createdAt),
      }));

  const trackItems = [...items, ...items];
  const firstItem = items[0];

  return (
    <div className={css.activityTicker}>
      <div className={css.activityStatic}>
        <span className={css.activityItem}>
          {firstItem.node}
          {firstItem.time ? (
            <span className={css.activityTime}>
              {' '}
              · <ActivityTimeLabel time={firstItem.time} />
            </span>
          ) : null}
        </span>
      </div>
      <div className={css.activityTrackViewport}>
        <div className={css.activityTrack}>
          {trackItems.map((item, index) => (
            <span key={`${item.id}-${index}`} className={css.activityItem}>
              {item.node}
              {item.time ? (
                <span className={css.activityTime}>
                  {' '}
                  · <ActivityTimeLabel time={item.time} />
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Small live badge on the hero photo, e.g. "195+ feestitems in regio Gent" -
// only ever a real number fetched from the API, never a placeholder.
const ListingsCountBadge = () => {
  const dispatch = useDispatch();
  const [count, setCount] = useState(null);

  useEffect(() => {
    dispatch(fetchListingsCountThunk())
      .unwrap()
      .then(setCount)
      .catch(() => setCount(null));
  }, []);

  if (!count) {
    return null;
  }

  return (
    <div className={css.countBadge}>
      <span className={css.countBadgeDot} />
      <span className={css.countBadgeNumber}>{count}+</span>
      <FormattedMessage id="LandingPageHero.countBadge" />
    </div>
  );
};

const TrustCheckIcon = () => (
  <svg className={css.trustIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M16.667 5L7.5 14.167 3.333 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrustRow = () => (
  <ul className={css.trustRow}>
    {TRUST_ITEMS_RENT.map(item => {
      return (
        <li key={item} className={css.trustItem}>
          <TrustCheckIcon />
          <FormattedMessage id={`LandingPageHero.trust.${item}`} />
        </li>
      );
    })}
  </ul>
);

// A plain secondary link, not a second competing module - the hero is
// renter-only now (see the conversation this replaced the old RoleTabs
// toggle + QuickListForm in). Providers get their own full section further
// down the page instead (HomepageProviderSection).
const ProviderLink = () => (
  <NamedLink name="NewListingPage" className={css.providerLink}>
    <FormattedMessage id="LandingPageHero.providerLink" />
  </NamedLink>
);

/**
 * LandingPageHero - replaces the hosted "hero" section on the homepage with
 * a code-defined hero: a hyperlocal heading, the real search bar, a plain
 * secondary link for providers, and trust signals below it. Renter-only by
 * design - a conversion audit flagged the previous huren/verhuren toggle
 * for giving a visitor with rental intent the bedrijfslogica of a two-sided
 * marketplace to parse before they could even search. Providers get their
 * own full section further down the page (HomepageProviderSection).
 *
 * @component
 * @returns {JSX.Element}
 */
const LandingPageHero = () => {
  return (
    <>
      <section className={css.root}>
        <span className={css.blobOne} aria-hidden="true" />
        <span className={css.blobTwo} aria-hidden="true" />
        <div className={css.grid}>
          <div className={css.inner}>
            <h1 className={css.heading}>
              <FormattedMessage id="LandingPageHero.rent.titleLine1" />
              <br />
              <em className={css.headingAccent}>
                <FormattedMessage id="LandingPageHero.rent.titleAccent" />
              </em>
            </h1>
            <p className={css.lede}>
              <FormattedMessage id="LandingPageHero.rent.lede" />
            </p>

            <div className={css.searchCardWrap}>
              <div className={css.actionModule}>
                <UnifiedSearchForm />
              </div>
            </div>

            <TrustRow />
            <ProviderLink />
          </div>

          <div className={css.imageColumn}>
            <div className={css.imageFrame}>
              <HeroPhoto />
              <ListingsCountBadge />
            </div>
          </div>
        </div>
      </section>
      <ActivityTicker />
    </>
  );
};

export default LandingPageHero;
