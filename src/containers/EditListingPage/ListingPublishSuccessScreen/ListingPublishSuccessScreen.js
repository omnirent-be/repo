import React, { useEffect, useRef, useState } from 'react';

import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createResourceLocatorString } from '../../../util/routes';
import { createSlug } from '../../../util/urlHelpers';
import { Button, Page } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';

import { generateShareImage, getBrandLogoUrl, getListingImageUrl } from './generateShareImage';
import Confetti from './Confetti';

import css from './ListingPublishSuccessScreen.module.css';

const COPY_CONFIRMATION_TIMEOUT_MS = 2500;

/**
 * Shown once, right after a brand-new listing is published (see
 * EditListingPage.js's shouldRedirectAfterPosting branch), instead of the
 * usual immediate redirect to the listing page. Gives the provider a
 * shareable, auto-generated 9:16 image for their Instagram Story/WhatsApp,
 * a copyable link, and a "share to get 7 days featured" incentive - see the
 * "Wat gebeurt er direct NA publicatie?" section of the listing-wizard spec.
 * Purely a share/download aid: sharing itself isn't tracked or verified
 * here, and no featured-listing status is granted automatically - that
 * follow-through is a manual/marketing step, matching how the incentive
 * text itself frames it ("tag @omnirent.be").
 *
 * @component
 * @param {Object} props
 * @param {propTypes.ownListing} props.listing - the just-published listing
 * @param {Function} props.onContinue - called when the provider is done here
 * @returns {JSX.Element}
 */
const ListingPublishSuccessScreen = props => {
  const { listing, onContinue } = props;
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();

  const [shareImageUrl, setShareImageUrl] = useState(null);
  const [imageGenerationFailed, setImageGenerationFailed] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const copyTimeoutRef = useRef(null);
  const objectUrlRef = useRef(null);

  const title = listing?.attributes?.title || '';
  const slug = createSlug(title);
  const listingId = listing?.id?.uuid;

  const listingPath = listingId
    ? createResourceLocatorString('ListingPage', routeConfiguration, { id: listingId, slug }, {})
    : null;
  const listingUrl =
    listingPath && config.marketplaceRootURL ? `${config.marketplaceRootURL}${listingPath}` : null;

  useEffect(() => {
    let isMounted = true;
    const firstImage = listing?.images?.[0] || null;
    const imageUrl = getListingImageUrl(firstImage);
    const logoUrl = getBrandLogoUrl(config.branding);
    const caption = intl.formatMessage(
      { id: 'ListingPublishSuccessScreen.shareImageCaption' },
      { marketplaceName: config.marketplaceName }
    );

    generateShareImage({ title, imageUrl, logoUrl, caption }).then(blob => {
      if (!isMounted) {
        return;
      }
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setShareImageUrl(url);
      } else {
        setImageGenerationFailed(true);
      }
    });

    return () => {
      isMounted = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
    // Only ever runs once, for the listing this screen was shown for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyLink = () => {
    if (!listingUrl) {
      return;
    }
    navigator.clipboard
      .writeText(listingUrl)
      .then(() => {
        setCopyState('copied');
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(
          () => setCopyState('idle'),
          COPY_CONFIRMATION_TIMEOUT_MS
        );
      })
      .catch(() => setCopyState('failed'));
  };

  const downloadFileName = `omnirent-${slug || 'zoekertje'}.png`;

  return (
    <Page
      title={intl.formatMessage({ id: 'ListingPublishSuccessScreen.pageTitle' })}
      scrollingDisabled={false}
    >
      <TopbarContainer />
      <Confetti />
      <div className={css.root}>
        <div className={css.content}>
          <h1 className={css.heading}>
            <FormattedMessage id="ListingPublishSuccessScreen.heading" />
          </h1>
          <p className={css.subHeading}>
            <FormattedMessage id="ListingPublishSuccessScreen.subHeading" values={{ title }} />
          </p>

          <div className={css.shareImageSection}>
            {shareImageUrl ? (
              <img
                className={css.shareImagePreview}
                src={shareImageUrl}
                alt={intl.formatMessage({ id: 'ListingPublishSuccessScreen.shareImageAlt' })}
              />
            ) : imageGenerationFailed ? (
              <p className={css.shareImageError}>
                <FormattedMessage id="ListingPublishSuccessScreen.shareImageFailed" />
              </p>
            ) : (
              <div className={css.shareImagePlaceholder}>
                <FormattedMessage id="ListingPublishSuccessScreen.shareImageGenerating" />
              </div>
            )}

            {shareImageUrl ? (
              <a
                className={css.downloadButton}
                href={shareImageUrl}
                download={downloadFileName}
              >
                <FormattedMessage id="ListingPublishSuccessScreen.downloadImage" />
              </a>
            ) : null}
          </div>

          <div className={css.copyLinkRow}>
            <input
              className={css.linkInput}
              type="text"
              readOnly
              value={listingUrl || ''}
              onFocus={e => e.target.select()}
            />
            <Button className={css.copyButton} type="button" onClick={handleCopyLink}>
              <FormattedMessage
                id={
                  copyState === 'copied'
                    ? 'ListingPublishSuccessScreen.linkCopied'
                    : 'ListingPublishSuccessScreen.copyLink'
                }
              />
            </Button>
          </div>

          <p className={css.incentiveText}>
            <FormattedMessage id="ListingPublishSuccessScreen.incentiveText" />
          </p>

          <div className={css.continueRow}>
            {/* Deliberately a plain button that hands back to
                EditListingPage.js's own redirect logic (via onContinue),
                rather than a link straight to ListingPage - that logic
                already knows to route to the pending-approval variant
                instead when needed, which duplicating here would risk
                getting out of sync with. */}
            <Button className={css.continueButton} type="button" onClick={onContinue}>
              <FormattedMessage id="ListingPublishSuccessScreen.continueButton" />
            </Button>
          </div>
        </div>
      </div>
    </Page>
  );
};

export default ListingPublishSuccessScreen;
