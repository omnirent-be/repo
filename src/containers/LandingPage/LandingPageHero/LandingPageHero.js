import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { formatMoney } from '../../../util/currency';
import { displayPrice } from '../../../util/configHelpers';
import { isBookingProcessAlias } from '../../../transactions/transaction';
import { NamedLink } from '../../../components';
import { createSlug, stringify } from '../../../util/urlHelpers';
import { fetchRecentActivityThunk } from '../../../ducks/recentActivity.duck';
import { fetchListingsCountThunk } from '../../../ducks/listingsCount.duck';
import { fetchHeroPhotosThunk } from '../../../ducks/heroPhotos.duck';
import { SearchCTA } from '../../PageBuilder/Primitives/SearchCTA/SearchCTA';

import css from './LandingPageHero.module.css';

// The same background photo already uploaded for the (now code-replaced)
// hosted "hero" section - reused here as a real image instead of a stock
// photo, via its public Sharetribe/imgix asset URL.
const HERO_IMAGE_URL =
  'https://sharetribe-assets.imgix.net/690e87ec-9691-4079-a358-055499ede745/raw/97/472bbb898252d3b7b3b7643b18e12aa5a69e57?auto=format&fit=clip&h=3600&w=3600&s=bdc4507b62b00facd299ecf7dc8b81a3';

// Keyword, location and dates - matches the "Wat zoek je? / Locatie /
// Datums" 3-field layout of the combined action module. No category field
// here (that's reachable via the quick-nav chips on the results page).
const SEARCH_FIELDS = {
  categories: false,
  keywordSearch: true,
  locationSearch: true,
  dateRange: true,
};

const TRUST_ITEMS_RENT = ['secure', 'noObligation', 'local'];

// See the comment where this is used, at the bottom of LandingPageHero.
const SHOW_ACTIVITY_TICKER = false;

const PHOTO_ROTATE_MS = 5000;

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

// Scrolling strip of real, recent listing activity (e.g. "Jan heeft net
// 'Partytent 6x10m' geplaatst"). Fetched once per page load; renders
// nothing while loading or if there's no data yet, rather than showing
// placeholder/fake activity. Moved here (below the hero) from the Topbar,
// which previously rendered it sitewide above the hero on the homepage.
const ActivityTicker = () => {
  const dispatch = useDispatch();
  const [items, setItems] = useState([]);

  useEffect(() => {
    dispatch(fetchRecentActivityThunk())
      .unwrap()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) {
    return null;
  }

  const trackItems = [...items, ...items];

  return (
    <div className={css.activityTicker}>
      <div className={css.activityTrack}>
        {trackItems.map((item, index) => (
          <span key={`${item.id}-${index}`} className={css.activityItem}>
            <span className={css.activityDot} />
            <FormattedMessage
              id="Topbar.activityTicker.item"
              values={{ name: item.authorName, title: item.title }}
            />
          </span>
        ))}
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

// One thin line - "🛡️ Borg & huurcontract beveiligd  •  💳 Veilig online
// betalen  •  📍 Direct bij Gentenaars" - instead of three separate
// checkmark rows, per the decision to keep the hero itself lean and let
// the listings grid be the first thing a visitor actually scrolls through.
const TRUST_ITEMS_EMOJI = { secure: '🛡️', noObligation: '💳', local: '📍' };

const TrustRow = () => (
  <p className={css.trustRow}>
    {TRUST_ITEMS_RENT.map((item, index) => (
      <React.Fragment key={item}>
        {index > 0 ? <span className={css.trustSeparator}>•</span> : null}
        <span className={css.trustItem}>
          <span aria-hidden="true">{TRUST_ITEMS_EMOJI[item]}</span>{' '}
          <FormattedMessage id={`LandingPageHero.trust.${item}`} />
        </span>
      </React.Fragment>
    ))}
  </p>
);

// The toggle forming the "roof" of the action module - switches its body
// below between the renter's search bar and the provider's quick-start
// prompt, rather than floating as its own separate control.
const RoleTabs = ({ isListMode, setIsListMode }) => (
  <div className={css.actionModuleTabs}>
    <button
      type="button"
      className={classNames(css.actionModuleTab, { [css.actionModuleTabActive]: !isListMode })}
      onClick={() => setIsListMode(false)}
    >
      <FormattedMessage id="LandingPageHero.tab.rent" />
    </button>
    <button
      type="button"
      className={classNames(css.actionModuleTab, { [css.actionModuleTabActive]: isListMode })}
      onClick={() => setIsListMode(true)}
    >
      <FormattedMessage id="LandingPageHero.tab.list" />
    </button>
  </div>
);

// The "Ik wil verhuren" side of the action module: a one-line prompt that
// leads into the real listing wizard (NewListingPage). The typed text is
// carried over as a `title` query param, which EditListingBasicsPanel.js's
// getInitialValues reads as a fallback initial title (same mechanism it
// already uses for `listingType`) - the wizard's own title field then
// picks it up and, since that field already runs suggestCategoryFromTitle
// on every title change (see EditListingBasicsForm.js), the category gets
// auto-suggested there too, without duplicating that logic here.
const QuickListForm = () => {
  const intl = useIntl();
  const [value, setValue] = useState('');
  const trimmedValue = value.trim();

  return (
    <div className={css.quickListForm}>
      <input
        type="text"
        className={css.quickListInput}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={intl.formatMessage({ id: 'LandingPageHero.list.inputPlaceholder' })}
      />
      <NamedLink
        name="NewListingPage"
        to={trimmedValue ? { search: `?${stringify({ title: trimmedValue })}` } : undefined}
        className={css.quickListButton}
      >
        <FormattedMessage id="LandingPageHero.list.cta" />
      </NamedLink>
    </div>
  );
};

/**
 * LandingPageHero - replaces the hosted "hero" section on the homepage with
 * a code-defined hero: a hyperlocal heading, a combined action module (a
 * huren/verhuren toggle forming the module's own header, switching its
 * body between the real search bar and a quick-start listing prompt), and
 * trust signals below it.
 *
 * @component
 * @returns {JSX.Element}
 */
const LandingPageHero = () => {
  const [isListMode, setIsListMode] = useState(false);

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
                <RoleTabs isListMode={isListMode} setIsListMode={setIsListMode} />
                <div className={css.actionModuleBody}>
                  {isListMode ? (
                    <QuickListForm />
                  ) : (
                    <SearchCTA searchFields={SEARCH_FIELDS} />
                  )}
                </div>
              </div>
            </div>

            <TrustRow />
          </div>

          <div className={css.imageColumn}>
            <div className={css.imageFrame}>
              <HeroPhoto />
              <ListingsCountBadge />
            </div>
          </div>
        </div>
      </section>
      {/* Disabled until official launch with real bookings - showing
          seed/test listing activity here would undermine trust rather than
          build it. Flip to true once there's real activity to show. */}
      {SHOW_ACTIVITY_TICKER ? <ActivityTicker /> : null}
    </>
  );
};

export default LandingPageHero;
