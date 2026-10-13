import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { trackEvent, trackMetaEvent } from '../../util/analytics';
import { formatMoney } from '../../util/currency';
import { getContactChannels } from '../../util/contactChannels';
import { openCookieSettings } from '../../util/consent';
import { rentalPages } from '../../util/rentalPages';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';

import { H1, H2, ListingCard, Logo, NamedLink, Page, ResponsiveImage } from '../../components';

import HomepageReviewsSection from '../LandingPage/HomepageReviewsSection/HomepageReviewsSection';

import { getRentalRowIds } from './RentalLandingPage.duck';
import RentalLeadForm, { LEAD_FORM_ID } from './RentalLeadForm';

import css from './RentalLandingPage.module.css';

const TIP_NUMBERS = [1, 2, 3, 4];
const FAQ_NUMBERS = [1, 2, 3, 4];
const MIN_LISTINGS_BEFORE_MORE = 6;
const MAX_LISTINGS_SHOWN = 8;
const FORM_SECTION_ID = 'aanvraag';

const getPageByPath = pathname => {
  const slug = (pathname || '').replace(/^\/+|\/+$/g, '');
  return rentalPages.find(page => page.slug === slug) || rentalPages[0];
};

/**
 * Lowest day price among the listings, formatted. Only listings that are priced per day count,
 * and the page only passes the listings that match its topic, so "vanaf X/dag" is true for
 * what the headline promises.
 */
const getLowestDayPrice = (listings, intl) => {
  const prices = listings
    .filter(l => l.attributes.publicData?.unitType === 'day' && l.attributes.price)
    .map(l => l.attributes.price);
  if (prices.length === 0) {
    return null;
  }
  const lowest = prices.reduce((min, price) => (price.amount < min.amount ? price : min));
  return formatMoney(intl, lowest);
};

const ListingGrid = ({ listings }) => (
  <ul className={css.grid}>
    {listings.map(listing => (
      <li key={listing.id.uuid} className={css.gridItem}>
        <ListingCard
          listing={listing}
          renderSizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
          lazyLoadImage
          showAuthorInfo={false}
        />
      </li>
    ))}
  </ul>
);

const GridSkeleton = () => (
  <ul className={css.grid}>
    {[0, 1, 2, 3].map(i => (
      <li key={i} className={css.gridItem}>
        <div className={css.skeleton} />
      </li>
    ))}
  </ul>
);

const IconPhone = () => (
  <svg className={css.channelIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1l-2.2 2.2z"
      fill="currentColor"
    />
  </svg>
);

const IconWhatsApp = () => (
  <svg className={css.channelIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.700 6.700 0 0 1-3.300-2.900c-.2-.4.2-.4.700-1.300.1-.2 0-.3 0-.5l-.8-1.900c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.300-.2.300-.9.900-.9 2.200s.9 2.500 1 2.700c.1.200 1.800 2.800 4.400 3.900 1.600.7 2.300.8 3.100.6.500-.1 1.500-.6 1.700-1.200.2-.6.2-1.100.2-1.200-.1-.1-.3-.2-.5-.3z"
      fill="currentColor"
    />
  </svg>
);

const IconChat = () => (
  <svg className={css.channelIcon} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      fill="currentColor"
    />
  </svg>
);

/**
 * A conversion landing page for one category in one region, for example
 * "springkasteel huren in Temse". Everything above the fold is built to get an enquiry:
 * a specific headline with a real "vanaf" price, one clear call to action, direct contact
 * buttons (phone, WhatsApp, Messenger, Instagram) and a three-field form. A sticky bar keeps
 * the call to action in reach on mobile. The page has no navigation menu or footer links, so
 * visitors from ads stay on it.
 *
 * Listings come from `RentalLandingPage.duck.js`, the pages from `src/config/rentalPages.js`
 * and the copy from the `RentalPage.*` translations. The phone, WhatsApp and answer-speed
 * details are optional environment variables (see `src/util/contactChannels.js`).
 *
 * @component
 * @param {Object} props
 * @param {Object} props.location current location, the path decides which page is shown
 * @returns {JSX.Element}
 */
export const RentalLandingPageComponent = props => {
  const { location } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const page = getPageByPath(location?.pathname);
  const { mainRowId, moreRowId } = getRentalRowIds(page.id);

  const mainRow = useSelector(state => state.homepageRows.rows[mainRowId]);
  const moreRow = useSelector(state => state.homepageRows.rows[moreRowId]);
  const mainListings = useSelector(state => getListingsById(state, mainRow?.ids || []));
  const moreListingsAll = useSelector(state => getListingsById(state, moreRow?.ids || []));

  const values = { region: page.regionName };
  const t = (key, extra) =>
    intl.formatMessage({ id: `RentalPage.${page.categoryId}.${key}` }, { ...values, ...extra });
  const common = (key, extra) =>
    intl.formatMessage({ id: `RentalPage.${key}` }, { ...values, ...extra });

  const mainIds = new Set(mainListings.map(l => l.id.uuid));
  const moreListings = moreListingsAll.filter(l => !mainIds.has(l.id.uuid));
  const isLoading = !mainRow || mainRow.inProgress;
  const showMore =
    !isLoading && page.fallbackQuery && mainListings.length < MIN_LISTINGS_BEFORE_MORE;
  const isEmpty = !isLoading && mainListings.length === 0 && moreListings.length === 0;

  const shownListings = mainListings.slice(0, MAX_LISTINGS_SHOWN);
  const priceFrom = getLowestDayPrice(mainListings, intl);
  const heroImageListing = mainListings.find(l => l.images?.length > 0);
  const heroImage = heroImageListing?.images?.[0];
  const heroImageVariants = Object.keys(heroImage?.attributes?.variants || {}).filter(name =>
    name.startsWith(config.layout?.listingImage?.variantPrefix || 'listing-card')
  );

  const channels = getContactChannels(
    common('whatsAppMessage', { topic: t('short'), region: page.regionName })
  );

  const marketplaceRootURL = config.marketplaceRootURL?.replace(/\/$/, '') || '';
  const pageUrl = `${marketplaceRootURL}/${page.slug}`;
  const pageTitle = t('h1');

  const faqs = FAQ_NUMBERS.map(n => ({ q: t(`faq${n}Q`), a: t(`faq${n}A`) }));
  const tips = TIP_NUMBERS.map(n => ({ title: t(`tip${n}Title`), text: t(`tip${n}Text`) }));

  const schema = [
    {
      '@context': 'http://schema.org',
      '@type': 'CollectionPage',
      name: t('metaTitle'),
      description: t('metaDescription'),
      url: pageUrl,
    },
    {
      '@context': 'http://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: common('breadcrumbHome'),
          item: marketplaceRootURL || '/',
        },
        { '@type': 'ListItem', position: 2, name: pageTitle, item: pageUrl },
      ],
    },
    {
      '@context': 'http://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];

  const onCtaClick = (e, source) => {
    trackEvent('rental_page_cta_clicked', { page: page.id, source });
    const section = document.getElementById(FORM_SECTION_ID);
    if (section) {
      e.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        document.getElementById(`${LEAD_FORM_ID}.name`)?.focus({ preventScroll: true });
      }, 500);
    }
  };

  const onChannelClick = method => {
    trackEvent('rental_contact_clicked', { page: page.id, method });
    trackMetaEvent('Contact', { content_name: page.id, content_category: page.categoryId, method });
  };

  const channelLinks = [
    channels.whatsAppHref && {
      key: 'whatsapp',
      href: channels.whatsAppHref,
      label: common('whatsAppButton'),
      Icon: IconWhatsApp,
      external: true,
    },
    channels.phoneHref && {
      key: 'phone',
      href: channels.phoneHref,
      label: common('callButton'),
      Icon: IconPhone,
      external: false,
    },
    {
      key: 'messenger',
      href: channels.messengerHref,
      label: common('messengerButton'),
      Icon: IconChat,
      external: true,
    },
    {
      key: 'instagram',
      href: channels.instagramHref,
      label: common('instagramButton'),
      Icon: IconChat,
      external: true,
    },
  ].filter(Boolean);

  const stickyChannels = channelLinks.filter(c => c.key === 'whatsapp' || c.key === 'phone');

  const renderChannel = ({ key, href, label, Icon, external }, className) => (
    <a
      key={key}
      href={href}
      className={className}
      onClick={() => onChannelClick(key)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <Icon />
      <span>{label}</span>
    </a>
  );

  const ctaButton = source => (
    <a
      href={`#${FORM_SECTION_ID}`}
      className={css.primaryButton}
      onClick={e => onCtaClick(e, source)}
    >
      {common('ctaPrimary')}
    </a>
  );

  return (
    <Page
      title={t('metaTitle')}
      description={t('metaDescription')}
      scrollingDisabled={scrollingDisabled}
      schema={schema}
    >
      <div className={css.root}>
        <header className={css.topBar}>
          <div className={css.topBarInner}>
            <span className={css.logo} aria-label={common('logoLabel')}>
              <span className={css.logoDesktop}>
                <Logo layout="desktop" />
              </span>
              <span className={css.logoMobile}>
                <Logo layout="mobile" />
              </span>
            </span>
            <div className={css.topBarActions}>
              {stickyChannels.map(channel => renderChannel(channel, css.topBarChannel))}
              <a
                href={`#${FORM_SECTION_ID}`}
                className={css.topBarCta}
                onClick={e => onCtaClick(e, 'header')}
              >
                {common('ctaPrimary')}
              </a>
            </div>
          </div>
        </header>

        <main>
          <section className={css.hero}>
            <div className={css.heroInner}>
              <div className={css.heroCopy}>
                <H1 as="h1" className={css.title}>
                  {pageTitle}
                  {priceFrom ? (
                    <span className={css.titlePrice}>
                      {' '}
                      — {common('priceFrom', { price: priceFrom })}
                    </span>
                  ) : null}
                </H1>
                <p className={css.lead}>{common('subheadline')}</p>

                <div className={css.heroActions}>{ctaButton('hero')}</div>

                <div
                  className={css.channels}
                  role="group"
                  aria-label={common('contactChannelsLabel')}
                >
                  <span className={css.channelsTitle}>{common('contactTitle')}</span>
                  <div className={css.channelList}>
                    {channelLinks.map(channel => renderChannel(channel, css.channel))}
                  </div>
                  {channels.responsePromise ? (
                    <p className={css.responsePromise}>{channels.responsePromise}</p>
                  ) : null}
                </div>

                <ul className={css.trust}>
                  <li>{common('trustFree')}</li>
                  <li>{common('trustPay')}</li>
                  <li>{common('trustLocal')}</li>
                </ul>
              </div>

              <div className={css.heroSide}>
                <div id={FORM_SECTION_ID} className={css.formCard}>
                  <h2 className={css.formTitle}>{common('form.title')}</h2>
                  <p className={css.formLede}>{common('form.lede')}</p>
                  <RentalLeadForm
                    page={page}
                    pageTitle={pageTitle}
                    responsePromise={channels.responsePromise}
                  />
                </div>
                {heroImage ? (
                  <ResponsiveImage
                    rootClassName={css.heroImage}
                    alt={heroImageListing.attributes.title}
                    image={heroImage}
                    variants={heroImageVariants}
                    sizes="(max-width: 1023px) 100vw, 480px"
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className={css.section} aria-labelledby="rental-listings-title">
            <div className={css.sectionInner}>
              <div className={css.sectionHeader}>
                <H2 as="h2" id="rental-listings-title" className={css.sectionTitle}>
                  {t('listingsTitle')}
                </H2>
                {!isLoading && mainListings.length > 0 ? (
                  <span className={css.count}>
                    {common('listingsCount', { count: mainRow.totalCount ?? mainListings.length })}
                  </span>
                ) : null}
              </div>

              {isLoading ? <GridSkeleton /> : <ListingGrid listings={shownListings} />}

              {showMore && moreListings.length > 0 ? (
                <>
                  <h3 className={css.subTitle}>
                    {intl.messages[`RentalPage.${page.categoryId}.moreTitle`]
                      ? t('moreTitle')
                      : common('moreTitle')}
                  </h3>
                  <ListingGrid listings={moreListings.slice(0, MAX_LISTINGS_SHOWN)} />
                </>
              ) : null}

              {isEmpty ? (
                <div className={css.empty}>
                  <p className={css.emptyTitle}>{common('emptyTitle')}</p>
                  <p>{common('emptyText')}</p>
                </div>
              ) : null}

              <div className={css.viewAll}>{ctaButton('listings')}</div>
            </div>
          </section>

          <HomepageReviewsSection />

          <section className={css.sectionAlt} aria-labelledby="rental-intro-title">
            <div className={css.sectionInnerNarrow}>
              <H2 as="h2" id="rental-intro-title" className={css.sectionTitle}>
                {t('introTitle')}
              </H2>
              <p className={css.paragraph}>{t('intro1')}</p>
              <p className={css.paragraph}>{t('intro2')}</p>
            </div>
          </section>

          <section className={css.section} aria-labelledby="rental-tips-title">
            <div className={css.sectionInner}>
              <H2 as="h2" id="rental-tips-title" className={css.sectionTitle}>
                {common('tipsTitle')}
              </H2>
              <ul className={css.tips}>
                {tips.map((tip, index) => (
                  <li key={tip.title} className={css.tip}>
                    <span className={css.tipNumber} aria-hidden="true">
                      {index + 1}
                    </span>
                    <h3 className={css.tipTitle}>{tip.title}</h3>
                    <p className={css.tipText}>{tip.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={css.sectionAlt} aria-labelledby="rental-faq-title">
            <div className={css.sectionInnerNarrow}>
              <H2 as="h2" id="rental-faq-title" className={css.sectionTitle}>
                {common('faqTitle')}
              </H2>
              <div className={css.faqList}>
                {faqs.map(({ q, a }) => (
                  <details key={q} className={css.faqItem}>
                    <summary className={css.faqQuestion}>{q}</summary>
                    <p className={css.faqAnswer}>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className={css.bottomCta} aria-labelledby="rental-bottom-title">
            <div className={css.bottomCtaInner}>
              <div>
                <h2 id="rental-bottom-title" className={css.bottomCtaTitle}>
                  {common('bottomTitle')}
                </h2>
                <p className={css.bottomCtaText}>{common('bottomText')}</p>
              </div>
              <div className={css.bottomCtaActions}>{ctaButton('bottom')}</div>
            </div>
          </section>
        </main>

        <footer className={css.footer}>
          <div className={css.footerInner}>
            <span>
              <FormattedMessage
                id="SectionFooter.copyright"
                values={{ year: new Date().getFullYear() }}
              />
            </span>
            <nav className={css.footerLinks} aria-label="OmniRent">
              <NamedLink name="PrivacyPolicyPage" target="_blank" className={css.footerLink}>
                {common('footerPrivacy')}
              </NamedLink>
              <NamedLink name="TermsOfServicePage" target="_blank" className={css.footerLink}>
                {common('footerTerms')}
              </NamedLink>
              <button type="button" className={css.footerLink} onClick={openCookieSettings}>
                {common('footerCookies')}
              </button>
            </nav>
          </div>
        </footer>

        <div className={css.sticky} role="group" aria-label={common('stickyLabel')}>
          <a
            href={`#${FORM_SECTION_ID}`}
            className={css.stickyCta}
            onClick={e => onCtaClick(e, 'sticky')}
          >
            {common('ctaShort')}
          </a>
          {stickyChannels.map(channel => renderChannel(channel, css.stickyChannel))}
        </div>
      </div>
    </Page>
  );
};

export default RentalLandingPageComponent;
