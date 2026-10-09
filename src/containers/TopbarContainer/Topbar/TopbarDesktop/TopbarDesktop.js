import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import {
  Avatar,
  InlineTextButton,
  LinkedLogo,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  NamedLink,
} from '../../../../components';

import SearchCapsule from '../../../SearchPage/SearchCapsule/SearchCapsule';
import CustomLinksMenu from './CustomLinksMenu/CustomLinksMenu';
import InboxIcon from '../InboxIcon';

import css from './TopbarDesktop.module.css';

const SignupLink = () => {
  return (
    <NamedLink id="signup-link" name="SignupPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.signup" />
      </span>
    </NamedLink>
  );
};

const LoginLink = () => {
  return (
    <NamedLink id="login-link" name="LoginPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.login" />
      </span>
    </NamedLink>
  );
};

// Only shown logged-out (see faqLinkMaybe below) - once a visitor is
// authenticated, this moves into the profile menu instead, alongside the
// other links that used to permanently crowd the topbar's right side.
const FaqLink = () => {
  return (
    <NamedLink id="faq-link" name="FaqPage" className={css.topbarLink}>
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.faqLink" />
      </span>
    </NamedLink>
  );
};

// Icon-only now (was a text link "Postvak IN") - frees up the ~90px that
// text took in the topbar's right side, which was crowding out the
// centered search capsule for logged-in users. The notification dot still
// works the same way.
const InboxLink = ({ notificationCount, inboxTab, intl }) => {
  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;
  return (
    <NamedLink
      id="inbox-link"
      className={css.inboxIconLink}
      name="InboxPage"
      params={{ tab: inboxTab }}
      title={intl.formatMessage({ id: 'TopbarDesktop.screenreader.inbox' })}
    >
      <InboxIcon />
      {notificationDot}
    </NamedLink>
  );
};

const ProfileMenu = ({ currentPage, currentUser, onLogout, showManageListingsLink, intl }) => {
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    return currentPage === page || isAccountSettingsPage ? css.currentPage : null;
  };

  return (
    <Menu skipFocusOnNavigation={true}>
      <MenuLabel
        id="profile-menu-label"
        className={css.profileMenuLabel}
        isOpenClassName={css.profileMenuIsOpen}
        ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
      >
        <Avatar className={css.avatar} user={currentUser} disableProfileLink />
      </MenuLabel>
      <MenuContent className={css.profileMenuContent}>
        {/* Featured first, not buried among the plain links below - this
            used to be its own wide "Nodig vrienden uit, verdien €5" button
            permanently taking up space in the topbar. */}
        <MenuItem key="ReferralPage">
          <NamedLink
            className={classNames(css.menuLink, css.menuLinkHighlight, currentPageClass('ReferralPage'))}
            name="ReferralPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.referralBadge" />
          </NamedLink>
        </MenuItem>
        {showManageListingsLink ? (
          <MenuItem key="ManageListingsPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('ManageListingsPage'))}
              name="ManageListingsPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.yourListingsLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {showManageListingsLink ? (
          <MenuItem key="BalancePage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('BalancePage'))}
              name="BalancePage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.balanceLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        <MenuItem key="FavoriteListingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('FavoriteListingsPage'))}
            name="FavoriteListingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.favoriteListingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="ProfileSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('ProfileSettingsPage'))}
            name="ProfileSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="AccountSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('AccountSettingsPage'))}
            name="AccountSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="FaqPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('FaqPage'))}
            name="FaqPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.faqLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="logout">
          <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.logout" />
          </InlineTextButton>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/**
 * Topbar for desktop layout
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {CurrentUser} props.currentUser API entity
 * @param {string?} props.currentPage
 * @param {boolean} props.isAuthenticated
 * @param {number} props.notificationCount
 * @param {Function} props.onLogout
 * @param {Function} props.onSearchSubmit
 * @param {Object?} props.initialSearchFormValues
 * @param {Object} props.intl
 * @param {Object} props.config
 * @param {boolean} props.showSearchForm
 * @param {boolean} props.showCreateListingsLink
 * @param {string} props.inboxTab
 * @returns {JSX.Element} search icon
 */
const TopbarDesktop = props => {
  const {
    className,
    config,
    customLinks,
    currentUser,
    currentPage,
    rootClassName,
    notificationCount = 0,
    intl,
    isAuthenticated,
    onLogout,
    onSearchSubmit,
    initialSearchFormValues = {},
    showSearchForm,
    showCreateListingsLink,
    inboxTab,
  } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marketplaceName = config.marketplaceName;
  const authenticatedOnClientSide = mounted && isAuthenticated;
  const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;

  const giveSpaceForSearch = customLinks == null || customLinks?.length === 0;
  const classes = classNames(rootClassName || css.root, className);

  const inboxLinkMaybe = authenticatedOnClientSide ? (
    <InboxLink notificationCount={notificationCount} inboxTab={inboxTab} intl={intl} />
  ) : null;

  // Logged-out visitors have no profile menu to hold this, and the topbar's
  // right side is light for them anyway (just Signup/Login) - logged-in,
  // it moved into the profile menu (see ProfileMenu's FaqPage MenuItem).
  const faqLinkMaybe = authenticatedOnClientSide ? null : <FaqLink />;

  const profileMenuMaybe = authenticatedOnClientSide ? (
    <ProfileMenu
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={onLogout}
      showManageListingsLink={showCreateListingsLink}
      intl={intl}
    />
  ) : null;

  // Inbox link rendered as a small badge pinned to the avatar's own top-right
  // corner (see .profileWithInbox/.inboxIconLink) rather than as a separate
  // icon floating to its left, so unread messages read as "this account has
  // something for you" instead of looking like an unrelated nav item.
  const profileWithInboxMaybe = authenticatedOnClientSide ? (
    <div className={css.profileWithInbox}>
      {profileMenuMaybe}
      {inboxLinkMaybe}
    </div>
  ) : null;

  const signupLinkMaybe = isAuthenticatedOrJustHydrated ? null : <SignupLink />;
  const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink />;

  // A flex spacer always sits between the logo and the links, regardless of
  // whether the search capsule is actually shown, so the logo/links
  // positions stay put when showSearchForm flips (e.g. scrolling past the
  // landing page hero - see Topbar.js). The capsule itself, when shown, is
  // positioned separately (absolutely, centered in the nav - see its own
  // .outsideClickWrapper) rather than taking up this flex space, so it's
  // centered on the whole topbar regardless of how wide the logo/links
  // happen to be.
  const spacerMaybe = (
    <div
      className={classNames(css.spacer, css.topbarSearchWithLeftPadding, {
        [css.takeAvailableSpace]: giveSpaceForSearch,
      })}
    />
  );
  const searchFormMaybe = showSearchForm ? (
    <SearchCapsule onSubmit={onSearchSubmit} initialValues={initialSearchFormValues} />
  ) : null;

  return (
    <nav
      className={classes}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.topbarNavigation' })}
    >
      <LinkedLogo
        id="logo-topbar-desktop"
        className={css.logoLink}
        layout="desktop"
        alt={intl.formatMessage({ id: 'TopbarDesktop.logo' }, { marketplaceName })}
        linkToExternalSite={config?.topbar?.logoLink}
      />
      {spacerMaybe}
      {searchFormMaybe}

      <CustomLinksMenu
        currentPage={currentPage}
        customLinks={customLinks}
        intl={intl}
        hasClientSideContentReady={authenticatedOnClientSide || !isAuthenticatedOrJustHydrated}
        showCreateListingsLink={showCreateListingsLink}
      />

      {faqLinkMaybe}
      {profileWithInboxMaybe}
      {signupLinkMaybe}
      {loginLinkMaybe}
    </nav>
  );
};

export default TopbarDesktop;
