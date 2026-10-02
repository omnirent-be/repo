// ⚠️ If you modify the styling of this component and you're using the SectionListings component in your marketplace (featured listings)
// please reflect those changes in the calculateCarouselHeight function in SectionListing.js to avoid layout issues
import React, { useState } from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { requireListingImage } from '../../util/configHelpers';
import { lazyLoadWithDimensions } from '../../util/uiHelpers';
import { createSlug } from '../../util/urlHelpers';
import { formatPostcodeDistrictLabel } from '../../util/maps';
import { haversineDistanceKm, formatDistanceKm } from '../../util/distance';
import { getExternalReview } from '../../util/userHelpers';

import {
  AspectRatioWrapper,
  FavoriteButton,
  NamedLink,
  ResponsiveImage,
  ListingCardThumbnail,
} from '../../components';

import { getListingCardTranslations } from './ListingCard.helpers';

import css from './ListingCard.module.css';

const LazyImage = lazyLoadWithDimensions(ResponsiveImage, { loadAfterInitialRendering: 3000 });
const SWIPE_THRESHOLD_PX = 40;

/**
 * ListingCardImage
 * Renders the card's image as a small carousel when the listing has more
 * than one photo (click-through dots, plus touch swipe on mobile) - or a
 * single static image, or a stylized placeholder if images are disabled
 * for the listing type.
 * @component
 * @param {Object} props
 * @param {Object} props.listing listing entity with image data
 * @param {Function?} props.setActivePropsMaybe mouse enter/leave handlers for map highlighting
 * @param {string} props.title listing title for alt text
 * @param {string} props.renderSizes img/srcset size rules
 * @param {number} props.aspectWidth aspect ratio width
 * @param {number} props.aspectHeight aspect ratio height
 * @param {string} props.variantPrefix image variant prefix (e.g. "listing-card")
 * @param {boolean} props.showListingImage whether to show actual listing image or not
 * @param {Object?} props.style the background color for the listing card with no image
 * @param {ReactNode?} props.overlay content positioned on top of the image (e.g. favorite button)
 * @returns {JSX.Element} listing image with fixed aspect ratio or fallback preview
 */
const ListingCardImage = props => {
  const {
    listing,
    setActivePropsMaybe,
    title,
    renderSizes,
    aspectWidth,
    aspectHeight,
    variantPrefix,
    aspectRatioClassName,
    lazyLoadImage,
    overlay,
  } = props;

  const images = listing?.images || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const activeImage = images[activeIndex] || images[0] || null;
  const variants = activeImage
    ? Object.keys(activeImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const aspectRatioClass = aspectRatioClassName || css.aspectRatioWrapper;
  const ImageComponent = lazyLoadImage ? LazyImage : ResponsiveImage;

  const goToIndex = (e, index) => {
    // The whole card is a <NamedLink> (an <a>) - without these, clicking
    // a dot would also navigate to the listing page.
    e.preventDefault();
    e.stopPropagation();
    setActiveIndex(index);
  };

  const handleTouchStart = e => setTouchStartX(e.touches?.[0]?.clientX ?? null);
  const handleTouchEnd = e => {
    if (touchStartX == null || images.length < 2) {
      return;
    }
    const endX = e.changedTouches?.[0]?.clientX ?? touchStartX;
    const deltaX = endX - touchStartX;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
      const direction = deltaX < 0 ? 1 : -1;
      setActiveIndex(prev => Math.min(Math.max(prev + direction, 0), images.length - 1));
    }
    setTouchStartX(null);
  };

  return (
    <AspectRatioWrapper
      className={aspectRatioClass}
      width={aspectWidth}
      height={aspectHeight}
      {...setActivePropsMaybe}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <ImageComponent
        rootClassName={css.rootForImage}
        alt={title}
        image={activeImage}
        variants={variants}
        sizes={renderSizes}
      />
      {overlay}
      {images.length > 1 ? (
        <div className={css.imageDots}>
          {images.map((img, index) => (
            <button
              key={img.id?.uuid || index}
              type="button"
              className={classNames(css.imageDot, { [css.imageDotActive]: index === activeIndex })}
              onClick={e => goToIndex(e, index)}
              aria-label={`Foto ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </AspectRatioWrapper>
  );
};

/**
 * ListingCard
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to component's own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string?} props.aspectRatioClassName custom className for AspectRatioWrapper component
 * @param {Object} props.listing API entity: listing or ownListing
 * @param {string?} props.renderSizes for img/srcset
 * @param {Function?} props.setActiveListing
 * @param {boolean?} props.showAuthorInfo
 * @param {propTypes.currentUser} [props.currentUser] - Pass together with onToggleFavoriteListing to show the favorite (heart) button
 * @param {boolean?} props.isFavorite whether this listing is already in currentUser's favorites
 * @param {Function?} props.onToggleFavoriteListing (listingId) => Promise - if omitted, no favorite button is shown
 * @param {string?} props.favoriteListingIdInProgress the listing id currently being toggled, to show a spinner on that one card
 * @param {{lat: number, lng: number}} [props.visitorPosition] - visitor's (or Gent-center fallback) coordinates, for the "X km van jou" distance label - see useVisitorPosition.js
 * @returns {JSX.Element} listing card to be used in search result panel etc.
 */
export const ListingCard = props => {
  const config = useConfiguration();
  const intl = props.intl || useIntl();

  const {
    className,
    rootClassName,
    aspectRatioClassName,
    darkMode,
    listing,
    renderSizes,
    setActiveListing,
    showAuthorInfo = true,
    lazyLoadImage = true,
    currentUser,
    isFavorite,
    onToggleFavoriteListing,
    favoriteListingIdInProgress,
    visitorPosition,
  } = props;

  const translations = getListingCardTranslations(listing, config, intl);
  const {
    titlePlain,
    titleFormatted,
    cardAriaLabel,
    priceTooltip,
    priceMessage,
    authorName,
  } = translations;

  const classes = classNames(rootClassName || css.root, className);

  const id = listing?.id?.uuid;
  const { title = '', publicData, geolocation } = listing?.attributes || {};
  const slug = createSlug(title);

  const { listingType, cardStyle } = publicData || {};
  // Public, pre-booking location hint - never the exact address (that's
  // revealed only after a paid booking, see TransactionPage.js's
  // showBookingLocation). Built from postalCode/city/neighborhood saved by
  // EditListingDeliveryPanel.js (see GeocoderMapbox.js's
  // extractLocationLabelParts) - null (renders nothing) for listings saved
  // before this existed.
  const placeLabel = formatPostcodeDistrictLabel(publicData?.location);
  // "X m/km van jou" - only computable when both the listing's precise
  // geolocation (fuzzed on the public map, but exact on the server/here)
  // and the visitor's position (real or Gent-center fallback, see
  // useVisitorPosition.js) are available.
  const distanceLabel =
    visitorPosition && geolocation
      ? formatDistanceKm(
          haversineDistanceKm(visitorPosition.lat, visitorPosition.lng, geolocation.lat, geolocation.lng)
        )
      : null;
  const locationLabel = [placeLabel, distanceLabel ? `${distanceLabel} van jou` : null]
    .filter(Boolean)
    .join(' • ');
  const validListingTypes = config.listing.listingTypes || [];
  const foundListingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);
  // Render the listing image only if listing images are enabled in the listing type
  const showListingImage = requireListingImage(foundListingTypeConfig);

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;

  // Sets the listing as active in the search map when hovered (if the search map is enabled)
  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(listing?.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  const favoriteButtonMaybe = onToggleFavoriteListing ? (
    <div className={css.favoriteButtonWrapper}>
      <FavoriteButton
        listingId={id}
        currentUser={currentUser}
        isFavorite={isFavorite}
        inProgress={favoriteListingIdInProgress === id}
        onToggleFavorite={onToggleFavoriteListing}
      />
    </div>
  ) : null;

  // Only claim deposit protection for listings that actually have a
  // deposit set (see EditListingPricingPanel.js's depositInSubunits) -
  // never a blanket claim on every card.
  const depositBadgeMaybe =
    publicData?.depositInSubunits != null ? (
      <div className={css.depositBadge}>
        <FormattedMessage id="ListingCard.depositBadge" />
      </div>
    ) : null;

  // "Kofferbak-Index" - see EditListingRentalDetailsForm.js's
  // publicData.transportSize. Answers "past dit in mijn auto?" at a glance,
  // without opening the listing.
  const transportMessageId = {
    compact: 'ListingCard.transportCompact',
    medium: 'ListingCard.transportMedium',
    large: 'ListingCard.transportLarge',
  }[publicData?.transportSize];
  const transportBadgeMaybe = transportMessageId ? (
    <div className={css.transportBadge}>
      <FormattedMessage id={transportMessageId} />
    </div>
  ) : null;

  const topLeftBadgesMaybe =
    depositBadgeMaybe || transportBadgeMaybe ? (
      <div className={css.badgeStack}>
        {depositBadgeMaybe}
        {transportBadgeMaybe}
      </div>
    ) : null;

  // "Zelf ophalen" / "Levering mogelijk" - see EditListingDeliveryPanel.js's
  // publicData.deliveryOptions (the same field search filters use).
  const deliveryOptions = publicData?.deliveryOptions || [];
  const shippingPostalCode = publicData?.location?.postalCode;
  const deliveryLabel = deliveryOptions.includes('shipping')
    ? intl.formatMessage(
        {
          id: shippingPostalCode
            ? 'ListingCard.deliveryShippingWithPostalCode'
            : 'ListingCard.deliveryShipping',
        },
        { postalCode: shippingPostalCode }
      )
    : deliveryOptions.includes('pickup')
    ? intl.formatMessage({ id: 'ListingCard.deliveryPickup' })
    : null;

  // Self-reported rating (see getExternalReview in userHelpers.js) - a
  // platform-computed aggregate would need a per-provider reviews.query
  // call, which doesn't scale to a results grid, so this is what's shown
  // here instead. Not shown at all when the provider hasn't set one.
  const externalReview = getExternalReview(listing?.author?.attributes?.profile?.publicData);

  // Deposit amount, shown next to the price (separate from the badge
  // above, which only signals "a deposit exists" - this is the number).
  const depositAmountMaybe =
    publicData?.depositInSubunits != null && listing?.attributes?.price?.currency
      ? intl.formatMessage(
          { id: 'ListingCard.depositAmount' },
          {
            depositAmount: intl.formatNumber(publicData.depositInSubunits / 100, {
              style: 'currency',
              currency: listing.attributes.price.currency,
            }),
          }
        )
      : null;

  return (
    <NamedLink
      className={classes}
      name="ListingPage"
      params={{ id, slug }}
      ariaLabel={cardAriaLabel}
    >
      {showListingImage ? (
        <ListingCardImage
          renderSizes={renderSizes}
          title={titlePlain}
          listing={listing}
          setActivePropsMaybe={setActivePropsMaybe}
          aspectWidth={aspectWidth}
          aspectHeight={aspectHeight}
          variantPrefix={variantPrefix}
          aspectRatioClassName={aspectRatioClassName}
          lazyLoadImage={lazyLoadImage}
          overlay={
            <>
              {topLeftBadgesMaybe}
              {favoriteButtonMaybe}
            </>
          }
        />
      ) : (
        <ListingCardThumbnail
          style={cardStyle}
          listingTitle={title}
          className={aspectRatioClassName}
          width={aspectWidth}
          height={aspectHeight}
          setActivePropsMaybe={setActivePropsMaybe}
        />
      )}
      <div className={css.info}>
        <div className={css.mainInfo}>
          {locationLabel ? (
            <div className={classNames(css.locationLabel, { [css.lightText]: darkMode })}>
              {locationLabel}
            </div>
          ) : null}
          {showListingImage && (
            <div className={classNames(css.title, { [css.lightText]: darkMode })}>
              {titleFormatted}
            </div>
          )}
          {showAuthorInfo || deliveryLabel ? (
            <div className={classNames(css.authorRow, { [css.lightText]: darkMode })}>
              {showAuthorInfo ? (
                <span className={css.authorInfo}>
                  {authorName}
                  {externalReview ? (
                    <span className={css.rating}>
                      {' '}
                      ★ {externalReview.rating}
                      {externalReview.count != null ? ` (${externalReview.count})` : null}
                    </span>
                  ) : null}
                </span>
              ) : null}
              {showAuthorInfo && deliveryLabel ? <span className={css.authorRowDot}>•</span> : null}
              {deliveryLabel ? <span className={css.deliveryLabel}>{deliveryLabel}</span> : null}
            </div>
          ) : null}
        </div>
        <div className={css.priceRow}>
          {priceMessage ? (
            <div className={css.price} title={priceTooltip}>
              {priceMessage}
            </div>
          ) : null}
          {depositAmountMaybe ? <div className={css.depositAmount}>{depositAmountMaybe}</div> : null}
        </div>
      </div>
    </NamedLink>
  );
};

export default ListingCard;
