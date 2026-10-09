import { displayPrice, isPriceVariationsEnabled } from '../../util/configHelpers';
import { formatMoney, formatMoneyWhole } from '../../util/currency';
import { richText } from '../../util/richText';
import { isBookingProcessAlias, isNegotiationProcessAlias } from '../../transactions/transaction';

import css from './ListingCard.module.css';

const MIN_LENGTH_FOR_LONG_WORDS = 10;

const priceData = (price, currency, intl) => {
  if (price && price.currency === currency) {
    // No decimals on the card itself (a prominent "€ 100" reads faster
    // than "€ 100,00") - the tooltip keeps the exact amount.
    const formattedPrice = formatMoneyWhole(intl, price);
    const priceTooltip = formatMoney(intl, price);
    return { formattedPrice, priceTooltip };
  } else if (price) {
    return {
      formattedPrice: intl.formatMessage(
        { id: 'ListingCard.unsupportedPrice' },
        { currency: price.currency }
      ),
      priceTooltip: intl.formatMessage(
        { id: 'ListingCard.unsupportedPriceTitle' },
        { currency: price.currency }
      ),
    };
  }
  return {};
};

/**
 * Returns all translated and formatted strings for ListingCard so the
 * presentational component can stay simple and aria-labels use the same copy.
 *
 * @param {Object} listing - API entity: listing or ownListing
 * @param {Object} config - app configuration (e.g. from useConfiguration())
 * @param {Object} intl - React Intl instance (e.g. from useIntl())
 * @returns {Object} translations and derived values:
 *   - titlePlain: raw title string (for aria/alt)
 *   - titleFormatted: React nodes from richText(title) for display
 *   - showPrice: whether to show the price block
 *   - priceTooltip: string for the price element's title attribute (tooltip on hover)
 *   - priceMessage: string or null for the price block content (same translation as used in cardAriaLabel when shown)
 *   - cardAriaLabel: ready-to-use aria-label for the card link (listing title + price line when shown)
 *   - authorName: "ListingCard.author" string containing author's display name
 */
export const getListingCardTranslations = (listing, config, intl) => {
  const { title = '', price, publicData } = listing?.attributes || {};

  const authorDisplayName = listing?.author?.attributes?.profile?.displayName;
  const authorName = intl.formatMessage(
    { id: 'ListingCard.author' },
    { authorName: authorDisplayName }
  );

  const validListingTypes = config.listing.listingTypes || [];
  const { listingType } = publicData || {};
  const listingTypeConfig = validListingTypes.find(conf => conf.listingType === listingType);

  const showPrice = displayPrice(listingTypeConfig);
  const { formattedPrice, priceTooltip } = priceData(price, config.currency, intl);

  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);
  const hasMultiplePriceVariants = isPriceVariationsInUse && publicData?.priceVariants?.length > 1;
  const isBookable = isBookingProcessAlias(publicData?.transactionProcessAlias);
  // OmniRent's "request-quote" listing type has Console's defaultListingFields.price
  // switched off (stale config left over from before this was a real,
  // payment-taking negotiation process - same issue already bypassed for
  // Pricing/Delivery, see EditListingPricingForm.js/EditListingDeliveryForm.js's
  // isNegotiation-aware fixes). EditListingPricingForm.js now requires a
  // real starting price for every quote listing, so showPrice being false
  // must not hide it - that's exactly what previously produced a bare
  // "Prijs op aanvraag" even on listings that do have a real "vanaf"-price.
  const isNegotiation = isNegotiationProcessAlias(publicData?.transactionProcessAlias);

  const priceMessageId =
    hasMultiplePriceVariants || isNegotiation
      ? 'ListingCard.priceStartingFrom'
      : 'ListingCard.price';

  const perUnitString = isBookable
    ? intl.formatMessage({ id: 'ListingCard.perUnit' }, { unitType: publicData?.unitType })
    : '';

  // Single formatted price line (amount + per-unit if applicable); used for both card aria and price block
  const priceValue = <span className={css.priceValue}>{formattedPrice}</span>;
  const pricePerUnit = isBookable ? <span className={css.perUnit}>{perUnitString}</span> : '';
  // A listing can legitimately have no price at all - either because this
  // particular listing hasn't had one set yet (an old quote listing from
  // before the starting-price requirement existed), or because its listing
  // type has the price field disabled entirely for a reason other than the
  // negotiation bypass above. Either way, show "Price on request" instead
  // of leaving the price line blank.
  const priceMessage =
    (showPrice || isNegotiation) && formattedPrice != null
      ? intl.formatMessage({ id: priceMessageId }, { priceValue, pricePerUnit })
      : intl.formatMessage({ id: 'ListingCard.priceOnRequest' });

  const cardAriaLabel =
    priceMessage.length > 0
      ? intl.formatMessage(
          { id: 'ListingCard.screenreader.label' },
          { listingTitle: title, formattedPrice: priceMessage }
        )
      : title;

  return {
    titlePlain: title,
    titleFormatted: richText(title, {
      longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
      longWordClass: css.longWord,
    }),
    authorName,
    showPrice,
    priceTooltip,
    priceMessage,
    cardAriaLabel,
  };
};
