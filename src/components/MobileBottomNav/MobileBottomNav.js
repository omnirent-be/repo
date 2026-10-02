import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { IconSearch, IconHeart, NamedLink } from '../../components';

import css from './MobileBottomNav.module.css';

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-4 4V5a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M4.5 20c1.2-3.6 4.2-5.6 7.5-5.6s6.3 2 7.5 5.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const AddIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Fixed bottom navigation bar shown on mobile only (hidden from
 * --viewportMedium up, see MobileBottomNav.module.css) - mirrors the
 * app-like Search/Saved/Verhuren/Berichten/Profiel pattern of Airbnb-style
 * marketplaces. Rendered as a sibling of Topbar in TopbarContainer.js, so
 * it's present on every page without having to touch each page's own
 * layout. Auth-gated destinations (Favorites, Inbox, profile settings)
 * rely on each route's own existing `auth: true` redirect-to-login
 * behavior (see routeConfiguration.js) - no separate logic needed here.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isAuthenticated
 * @param {number} [props.notificationCount] unread order/sale notifications, shown as a dot on "Berichten"
 * @returns {JSX.Element}
 */
const MobileBottomNav = props => {
  const { isAuthenticated, notificationCount = 0 } = props;

  const profileLinkProps = isAuthenticated
    ? { name: 'ProfileSettingsPage' }
    : { name: 'LoginPage' };

  return (
    <nav className={css.root}>
      <NamedLink name="SearchPage" className={css.item} activeClassName={css.itemActive}>
        <IconSearch className={css.icon} />
        <span className={css.label}>
          <FormattedMessage id="MobileBottomNav.search" />
        </span>
      </NamedLink>

      <NamedLink name="FavoriteListingsPage" className={css.item} activeClassName={css.itemActive}>
        <IconHeart className={css.icon} />
        <span className={css.label}>
          <FormattedMessage id="MobileBottomNav.saved" />
        </span>
      </NamedLink>

      <NamedLink name="NewListingPage" className={css.addItem}>
        <span className={css.addButton}>
          <AddIcon />
        </span>
        <span className={css.label}>
          <FormattedMessage id="MobileBottomNav.rentOut" />
        </span>
      </NamedLink>

      <NamedLink
        name="InboxPage"
        params={{ tab: 'orders' }}
        className={css.item}
        activeClassName={css.itemActive}
      >
        <span className={css.iconWrapper}>
          <MessageIcon />
          {notificationCount > 0 ? <span className={css.notificationDot} /> : null}
        </span>
        <span className={css.label}>
          <FormattedMessage id="MobileBottomNav.messages" />
        </span>
      </NamedLink>

      <NamedLink {...profileLinkProps} className={css.item} activeClassName={css.itemActive}>
        <ProfileIcon />
        <span className={css.label}>
          <FormattedMessage id="MobileBottomNav.profile" />
        </span>
      </NamedLink>
    </nav>
  );
};

export default MobileBottomNav;
