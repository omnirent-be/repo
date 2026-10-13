import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { trackEvent } from '../../util/analytics';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';

import { H1, H2, ListingCard, LayoutSingleColumn, NamedLink, Page } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import rentalPages from '../../config/rentalPages.json';
import { getRentalRowIds } from './RentalLandingPage.duck';

import css from './RentalLandingPage.module.css';

const TIP_NUMBERS = [1, 2, 3, 4];
const FAQ_NUMBERS = [1, 2, 3, 4];
const MIN_LISTINGS_BEFORE_MORE = 6;

export const getRentalPageRouteName = pageId => `RentalLandingPage_${pageId}`;

const getPageBySlug = pathname => {
  const slug = (pathname || '').replace(/^\/+|\/+$/g, '');
  return rentalPages.find(page => page.slug === slug) || rentalPages[0];
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

/**
 * A search-engine landing page for one rental topic in the Ghent region, for example
 * "springkasteel huren Gent". The page combines a focused H1 and intro, live listings, tips,
 * a FAQ (also published as FAQPage structured data) and links to the sibling pages.
 * The topics and their listing filters live in `src/config/rentalPages.json`; the copy lives
 * in the `RentalPage.*` translations.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.location current location, the path decides which topic is shown
 * @returns {JSX.Element}
 */
export const RentalLandingPageComponent = props => {
  const { location } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const page = getPageBySlug(location?.pathname);
  const { mainRowId, moreRowId } = getRentalRowIds(page.id);

  const mainRow = useSelector(state => state.homepageRows.rows[mainRowId]);
  const moreRow = useSelector(state => state.homepageRows.rows[moreRowId]);
  const mainListings = useSelector(state => getListingsById(state, mainRow?.ids || []));
  const moreListingsAll = useSelector(state => getListingsById(state, moreRow?.ids || []));

  const t = (key, values) => intl.formatMessage({ id: `RentalPage.${page.id}.${key}` }, values);
  const common = (key, values) => intl.formatMessage({ id: `RentalPage.${key}` }, values);

  const mainIds = new Set(mainListings.map(l => l.id.uuid));
  const moreListings = moreListingsAll.filter(l => !mainIds.has(l.id.uuid));
  const isLoading = !mainRow || mainRow.inProgress;
  const showMore =
    !isLoading && page.fallbackQuery && mainListings.length < MIN_LISTINGS_BEFORE_MORE;
  const isEmpty = !isLoading && mainListings.length === 0 && moreListings.length === 0;

  const marketplaceRootURL = config.marketplaceRootURL?.replace(/\/$/, '') || '';
  const pageUrl = `${marketplaceRootURL}/${page.slug}`;

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
        { '@type': 'ListItem', position: 2, name: t('h1'), item: pageUrl },
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

  const searchLinkProps = {
    name: 'SearchPage',
    to: { search: new URLSearchParams(page.searchQuery).toString().replace(/^/, '?') },
  };

  const otherPages = rentalPages.filter(p => p.id !== page.id);

  return (
    <Page
      title={t('metaTitle')}
      description={t('metaDescription')}
      scrollingDisabled={scrollingDisabled}
      schema={schema}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <header className={css.hero}>
            <div className={css.heroInner}>
              <nav aria-label={common('breadcrumbLabel')} className={css.breadcrumbs}>
                <NamedLink name="LandingPage" className={css.breadcrumbLink}>
                  <FormattedMessage id="RentalPage.breadcrumbHome" />
                </NamedLink>
                <span className={css.breadcrumbSeparator} aria-hidden="true">
                  ›
                </span>
                <span aria-current="page">{t('short')}</span>
              </nav>
              <H1 as="h1" className={css.title}>
                {t('h1')}
              </H1>
              <p className={css.lead}>{t('lead')}</p>
              <ul className={css.trust}>
                <li>{common('trustFree')}</li>
                <li>{common('trustPay')}</li>
                <li>{common('trustLocal')}</li>
              </ul>
              <div className={css.heroActions}>
                <NamedLink
                  {...searchLinkProps}
                  className={css.primaryButton}
                  onClick={() => trackEvent('rental_page_cta_clicked', { page: page.id })}
                >
                  {t('searchLabel')}
                </NamedLink>
                <NamedLink name="HowItWorksPage" className={css.secondaryLink}>
                  {common('howItWorks')}
                </NamedLink>
              </div>
            </div>
          </header>

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

              {isLoading ? <GridSkeleton /> : <ListingGrid listings={mainListings} />}

              {showMore && moreListings.length > 0 ? (
                <>
                  <h3 className={css.subTitle}>
                    {intl.messages[`RentalPage.${page.id}.moreTitle`]
                      ? t('moreTitle')
                      : common('moreTitle')}
                  </h3>
                  <ListingGrid listings={moreListings.slice(0, 8)} />
                </>
              ) : null}

              {isEmpty ? (
                <div className={css.empty}>
                  <p className={css.emptyTitle}>{common('emptyTitle')}</p>
                  <p>{common('emptyText')}</p>
                </div>
              ) : null}

              <div className={css.viewAll}>
                <NamedLink {...searchLinkProps} className={css.viewAllButton}>
                  {t('searchLabel')}
                  <span aria-hidden="true"> →</span>
                </NamedLink>
              </div>
            </div>
          </section>

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

          <section className={css.section} aria-labelledby="rental-other-title">
            <div className={css.sectionInner}>
              <H2 as="h2" id="rental-other-title" className={css.sectionTitle}>
                {common('otherTitle')}
              </H2>
              <ul className={css.chips}>
                {otherPages.map(other => (
                  <li key={other.id}>
                    <NamedLink name={getRentalPageRouteName(other.id)} className={css.chip}>
                      {intl.formatMessage({ id: `RentalPage.${other.id}.short` })} Gent
                    </NamedLink>
                  </li>
                ))}
                <li>
                  <NamedLink name="SearchPage" className={css.chip}>
                    {common('allCategories')}
                  </NamedLink>
                </li>
              </ul>
            </div>
          </section>

          <section className={css.provider}>
            <div className={css.providerInner}>
              <div>
                <h2 className={css.providerTitle}>{common('providerTitle')}</h2>
                <p className={css.providerText}>{common('providerText')}</p>
              </div>
              <NamedLink name="NewListingPage" className={css.providerButton}>
                {common('providerCta')}
              </NamedLink>
            </div>
          </section>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default RentalLandingPageComponent;
