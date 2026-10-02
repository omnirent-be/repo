import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import appSettings from '../../../config/settings';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';

import { pickBy } from '../../../util/common';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { parse, stringify } from '../../../util/urlHelpers';
import { createResourceLocatorString, matchPathname, pathByRouteName } from '../../../util/routes';
import {
  Button,
  IconArrowHead,
  IconClose,
  LimitedAccessBanner,
  LinkedLogo,
  Modal,
  ModalMissingInformation,
  NamedLink,
} from '../../../components';
import { getSearchPageResourceLocatorStringParams } from '../../SearchPage/SearchPage.shared';

import MenuIcon from './MenuIcon';
import SearchIcon from './SearchIcon';
import SearchCapsule from '../../SearchPage/SearchCapsule/SearchCapsule';
import TopbarMobileMenu from './TopbarMobileMenu/TopbarMobileMenu';
import TopbarDesktop from './TopbarDesktop/TopbarDesktop';

import css from './Topbar.module.css';
import { getCurrentUserTypeRoles, showCreateListingLinkForUser } from '../../../util/userHelpers';

const MAX_MOBILE_SCREEN_WIDTH = 1024;

const MOBILE_MENU_BUTTON_ID = 'mobileMenuButton';
const MOBILE_SEARCH_BUTTON_ID = 'mobileSearchButton';

const redirectToURLWithModalState = (history, location, modalStateParam) => {
  const { pathname, search, state } = location;
  const searchString = `?${stringify({ [modalStateParam]: 'open', ...parse(search) })}`;
  history.push(`${pathname}${searchString}`, state);
};

const redirectToURLWithoutModalState = (history, location, modalStateParam) => {
  const { pathname, search, state } = location;
  const queryParams = pickBy(parse(search), (v, k) => {
    return k !== modalStateParam;
  });
  const stringified = stringify(queryParams);
  const searchString = stringified ? `?${stringified}` : '';
  history.push(`${pathname}${searchString}`, state);
};

const isPrimary = o => o.group === 'primary';
const isSecondary = o => o.group === 'secondary';
const compareGroups = (a, b) => {
  const isAHigherGroupThanB = isPrimary(a) && isSecondary(b);
  const isALesserGroupThanB = isSecondary(a) && isPrimary(b);
  // Note: sort order is stable in JS
  return isAHigherGroupThanB ? -1 : isALesserGroupThanB ? 1 : 0;
};
// Returns links in order where primary links are returned first
const sortCustomLinks = customLinks => {
  const links = Array.isArray(customLinks) ? [...customLinks] : [];
  return links.sort(compareGroups);
};

// Resolves in-app links against route configuration
const getResolvedCustomLinks = (customLinks, routeConfiguration) => {
  const links = Array.isArray(customLinks) ? customLinks : [];
  return links.map(linkConfig => {
    const { type, href } = linkConfig;
    const isInternalLink = type === 'internal' || href.charAt(0) === '/';
    if (isInternalLink) {
      // Internal link
      try {
        const testURL = new URL('http://my.marketplace.com' + href);
        const matchedRoutes = matchPathname(testURL.pathname, routeConfiguration);
        if (matchedRoutes.length > 0) {
          const found = matchedRoutes[0];
          const to = { search: testURL.search, hash: testURL.hash };
          return {
            ...linkConfig,
            route: {
              name: found.route?.name,
              params: found.params,
              to,
            },
          };
        }
      } catch (e) {
        return linkConfig;
      }
    }
    return linkConfig;
  });
};

const isCMSPage = found =>
  found.route?.name === 'CMSPage' ? `CMSPage:${found.params?.pageId}` : null;
const isInboxPage = found =>
  found.route?.name === 'InboxPage' ? `InboxPage:${found.params?.tab}` : null;
// Find the name of the current route/pathname.
// It's used as handle for currentPage check.
const getResolvedCurrentPage = (location, routeConfiguration) => {
  const matchedRoutes = matchPathname(location.pathname, routeConfiguration);
  if (matchedRoutes.length > 0) {
    const found = matchedRoutes[0];
    const cmsPageName = isCMSPage(found);
    const inboxPageName = isInboxPage(found);
    return cmsPageName ? cmsPageName : inboxPageName ? inboxPageName : `${found.route?.name}`;
  }
};

// Promo banner for the launch campaign: the €10 discount is now only the
// public GENT10 coupon code (see server/api-util/coupons.js), not a
// per-user claim, so it's shown to everyone - logged in or not - rather
// than being tied to a credit balance. Dismissible: the closed state is
// remembered per browser via localStorage, keyed by version so a future
// campaign change can bring it back for everyone.
const PROMO_BANNER_DISMISSED_KEY = 'omnirent_promo_banner_dismissed_v1';

const PromoBanner = ({ isAuthenticated }) => {
  const intl = useIntl();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(PROMO_BANNER_DISMISSED_KEY) === 'true') {
        setIsDismissed(true);
      }
    } catch (e) {
      // Ignore - e.g. localStorage blocked. Banner just stays visible.
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(PROMO_BANNER_DISMISSED_KEY, 'true');
    } catch (e) {
      // Ignore - dismissal just won't be remembered on next visit.
    }
  };

  const showBanner = !isDismissed;
  if (!showBanner) {
    return null;
  }
  return (
    <div className={css.promoBanner} role="note">
      <span>
        <FormattedMessage id="Topbar.promoBanner.signupBonus" />
      </span>
      {!isAuthenticated ? (
        // Logged-in users already see this same link as the persistent
        // referral badge next to the account menu (see TopbarDesktop.js's
        // ReferralBadge) - showing it here too would just duplicate it.
        <NamedLink name="ReferralPage" className={css.promoBannerLink}>
          <FormattedMessage id="Topbar.promoBanner.referral" />
        </NamedLink>
      ) : null}
      <NamedLink name="HowItWorksPage" className={css.promoBannerLink}>
        <FormattedMessage id="Topbar.promoBanner.howItWorks" />
      </NamedLink>
      <button
        className={css.promoBannerClose}
        onClick={handleDismiss}
        aria-label={intl.formatMessage({ id: 'Topbar.promoBanner.close' })}
        type="button"
      >
        <IconClose rootClassName={css.promoBannerCloseIcon} size="small" />
      </button>
    </div>
  );
};

const GenericError = props => {
  const { show } = props;
  const classes = classNames(css.genericError, {
    [css.genericErrorVisible]: show,
  });
  return show ? (
    <div className={classes} role="alert">
      <div className={css.genericErrorContent}>
        <p className={css.genericErrorText}>
          <FormattedMessage id="Topbar.genericError" />
        </p>
      </div>
    </div>
  ) : null;
};

const TopbarComponent = props => {
  const {
    className,
    rootClassName,
    desktopClassName,
    mobileRootClassName,
    mobileClassName,
    isAuthenticated,
    isLoggedInAs,
    authScopes = [],
    authInProgress,
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    currentPage,
    notificationCount = 0,
    intl,
    history,
    location,
    onManageDisableScrolling,
    onResendVerificationEmail,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    showGenericError,
    config,
    routeConfiguration,
  } = props;

  // The search capsule (keywords + Locatie + Datum, see SearchCapsule.js)
  // is now the Topbar's search form everywhere - not just on SearchPage -
  // so submitting it from any page needs to land on /s with those params.
  // currentSearchParams (only passed when SearchPage itself renders
  // <TopbarContainer>, see SearchPageWithGrid.js) is spread first so
  // other already-active filters (price, category, ...) survive a
  // keywords/region/dates change made from the topbar while already on
  // the results page.
  const handleSubmit = values => {
    const { currentSearchParams, history, location, routeConfiguration } = props;
    const { keywords, pub_region, dates } = values || {};
    const capsuleParamsMaybe = {
      ...(keywords ? { keywords } : {}),
      ...(pub_region ? { pub_region } : {}),
      ...(dates ? { dates } : {}),
    };
    const searchParams = {
      ...currentSearchParams,
      ...capsuleParamsMaybe,
    };

    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(
      routeConfiguration,
      location
    );

    history.push(
      createResourceLocatorString(routeName, routeConfiguration, pathParams, searchParams)
    );
  };

  const handleLogout = () => {
    const { onLogout, history, routeConfiguration } = props;
    onLogout().then(() => {
      const path = pathByRouteName('LandingPage', routeConfiguration);

      // In production we ensure that data is really lost,
      // but in development mode we use stored values for debugging
      if (appSettings.dev) {
        history.push(path);
      } else if (typeof window !== 'undefined') {
        window.location = path;
      }

      console.log('logged out'); // eslint-disable-line
    });
  };

  const showCreateListingsLink = showCreateListingLinkForUser(config, currentUser);
  const { customer: isCustomer, provider: isProvider } = getCurrentUserTypeRoles(
    config,
    currentUser
  );

  /**
   * Determine which tab to use in the inbox link:
   * - if only provider role – sales
   * - if only customer role – orders
   * - if both roles – determine by currentUserHasListings value
   */
  const topbarInboxTab = !isCustomer
    ? 'sales'
    : !isProvider
    ? 'orders'
    : currentUserHasListings
    ? 'sales'
    : 'orders';

  const { mobilemenu, mobilesearch, keywords, pub_region, dates } = parse(location.search);

  // Custom links are sorted so that group="primary" are always at the beginning of the list.
  const sortedCustomLinks = sortCustomLinks(config.topbar?.customLinks);
  const customLinks = getResolvedCustomLinks(sortedCustomLinks, routeConfiguration);
  const resolvedCurrentPage = currentPage || getResolvedCurrentPage(location, routeConfiguration);

  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;

  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout = hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : true;
  const isMobileMenuOpen = isMobileLayout && mobilemenu === 'open';
  const isMobileSearchOpen = isMobileLayout && mobilesearch === 'open';

  const mobileMenu = (
    <TopbarMobileMenu
      isAuthenticated={isAuthenticated}
      currentUser={currentUser}
      onLogout={handleLogout}
      notificationCount={notificationCount}
      currentPage={resolvedCurrentPage}
      customLinks={customLinks}
      showCreateListingsLink={showCreateListingsLink}
      inboxTab={topbarInboxTab}
    />
  );

  // Matches SearchCapsule's own initialValues shape (see SearchCapsule.js) -
  // read straight off whatever's currently in the URL, so the topbar
  // capsule reflects the active search/filters on any page, not just
  // SearchPage.
  const initialSearchFormValues = { keywords, pub_region, dates };

  const classes = classNames(rootClassName || css.root, className);

  // The landing page has its own, large central search bar (see
  // LandingPageHero) - showing the compact Topbar capsule there too was a
  // duplicate search bar. Hardcoded (not read from config.topbar.searchBar,
  // which is hosted-Console-controlled and not something this session can
  // verify/set) so this is deterministic: the capsule shows on every other
  // page always, and on the landing page only once the visitor scrolls
  // past the hero's own search bar (a fixed pixel threshold, since the
  // hero lives in a different component tree - no ref to measure its
  // actual height against).
  const isLandingPage = resolvedCurrentPage === 'LandingPage';
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);
  useEffect(() => {
    if (!isLandingPage || typeof window === 'undefined') {
      return undefined;
    }
    const HERO_SCROLL_THRESHOLD_PX = 480;
    const handleScroll = () => {
      setHasScrolledPastHero(window.scrollY > HERO_SCROLL_THRESHOLD_PX);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLandingPage]);
  const showSearchForm = !isLandingPage || hasScrolledPastHero;

  const mobileSearchButtonMaybe = showSearchForm ? (
    <Button
      id={MOBILE_SEARCH_BUTTON_ID}
      rootClassName={css.searchMenu}
      onClick={() => redirectToURLWithModalState(history, location, 'mobilesearch')}
      title={intl.formatMessage({ id: 'Topbar.searchIcon' })}
    >
      <SearchIcon
        className={css.searchMenuIcon}
        ariaLabel={intl.formatMessage({ id: 'Topbar.searchIcon' })}
      />
    </Button>
  ) : (
    <div className={css.searchMenu} />
  );

  const handleSkipToMainContent = e => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus the main content for screen readers
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      // Remove tabindex after blur to avoid tabbing into it later
      mainContent.addEventListener(
        'blur',
        () => {
          mainContent.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
  };

  return (
    <div className={classes}>
      <Button onClick={handleSkipToMainContent} className={css.skipToMainContent}>
        <FormattedMessage id="Topbar.skipToMainContent" />
        <IconArrowHead direction="right" size="small" rootClassName={css.skiptoMainArrow} />
      </Button>
      <PromoBanner isAuthenticated={isAuthenticated} />
      <LimitedAccessBanner
        isAuthenticated={isAuthenticated}
        isLoggedInAs={isLoggedInAs}
        authScopes={authScopes}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentPage={resolvedCurrentPage}
      />
      <nav className={classNames(mobileRootClassName || css.container, mobileClassName)}>
        <Button
          id={MOBILE_MENU_BUTTON_ID}
          rootClassName={css.menu}
          onClick={() => redirectToURLWithModalState(history, location, 'mobilemenu')}
          title={intl.formatMessage({ id: 'Topbar.menuIcon' })}
        >
          <MenuIcon
            className={css.menuIcon}
            ariaLabel={intl.formatMessage({ id: 'Topbar.menuIcon' })}
          />
          {notificationDot}
        </Button>
        <LinkedLogo
          id="logo-topbar-mobile"
          layout={'mobile'}
          alt={intl.formatMessage({ id: 'Topbar.logoIcon' })}
          linkToExternalSite={config?.topbar?.logoLink}
        />
        {mobileSearchButtonMaybe}
      </nav>
      <div className={css.desktop}>
        <TopbarDesktop
          className={desktopClassName}
          currentUserHasListings={currentUserHasListings}
          currentUser={currentUser}
          currentPage={resolvedCurrentPage}
          initialSearchFormValues={initialSearchFormValues}
          intl={intl}
          isAuthenticated={isAuthenticated}
          notificationCount={notificationCount}
          onLogout={handleLogout}
          onSearchSubmit={handleSubmit}
          config={config}
          customLinks={customLinks}
          showSearchForm={showSearchForm}
          showCreateListingsLink={showCreateListingsLink}
          inboxTab={topbarInboxTab}
        />
      </div>
      <Modal
        id="TopbarMobileMenu"
        containerClassName={css.modalContainer}
        isOpen={isMobileMenuOpen}
        onClose={() => redirectToURLWithoutModalState(history, location, 'mobilemenu')}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={MOBILE_MENU_BUTTON_ID}
      >
        {authInProgress ? null : mobileMenu}
      </Modal>
      <Modal
        id="TopbarMobileSearch"
        containerClassName={css.modalContainerSearchForm}
        isOpen={isMobileSearchOpen}
        onClose={() => redirectToURLWithoutModalState(history, location, 'mobilesearch')}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={MOBILE_SEARCH_BUTTON_ID}
      >
        <div className={css.searchContainer}>
          <SearchCapsule isMobile initialValues={initialSearchFormValues} onSubmit={handleSubmit} />
        </div>
      </Modal>
      <ModalMissingInformation
        id="MissingInformationReminder"
        containerClassName={css.missingInformationModal}
        currentUser={currentUser}
        currentUserHasListings={currentUserHasListings}
        currentUserHasOrders={currentUserHasOrders}
        location={location}
        onManageDisableScrolling={onManageDisableScrolling}
        onResendVerificationEmail={onResendVerificationEmail}
        sendVerificationEmailInProgress={sendVerificationEmailInProgress}
        sendVerificationEmailError={sendVerificationEmailError}
      />

      <GenericError show={showGenericError} />
    </div>
  );
};

/**
 * Topbar containing logo, main search and navigation links.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Object} props.desktopClassName add more style rules for TopbarDesktop
 * @param {Object} props.mobileRootClassName overwrite mobile layout root classes
 * @param {Object} props.mobileClassName add more style rules for mobile layout
 * @param {boolean} props.isAuthenticated
 * @param {boolean} props.isLoggedInAs
 * @param {Object} props.currentUser
 * @param {boolean} props.currentUserHasListings
 * @param {boolean} props.currentUserHasOrders
 * @param {string} props.currentPage
 * @param {number} props.notificationCount
 * @param {Function} props.onLogout
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onResendVerificationEmail
 * @param {Object} props.sendVerificationEmailInProgress
 * @param {Object} props.sendVerificationEmailError
 * @param {boolean} props.showGenericError
 * @param {Object} props.history
 * @param {Function} props.history.push
 * @param {Object} props.location
 * @param {string} props.location.search '?foo=bar'
 * @returns {JSX.Element} topbar component
 */
const Topbar = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  return (
    <TopbarComponent
      config={config}
      routeConfiguration={routeConfiguration}
      intl={intl}
      {...props}
    />
  );
};

export default Topbar;
