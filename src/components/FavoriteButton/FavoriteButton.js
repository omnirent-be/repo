import React from 'react';
import classNames from 'classnames';
import { useHistory, useLocation } from 'react-router-dom';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { createResourceLocatorString } from '../../util/routes';
import { useIntl } from '../../util/reactIntl';

import { IconHeart, IconSpinner } from '../../components';

import css from './FavoriteButton.module.css';

/**
 * Heart toggle for saving/unsaving a listing as a favorite. Works as an
 * overlay on ListingCard (on top of its NamedLink) or standalone on
 * ListingPage - stops propagation either way so it never triggers a
 * navigation click underneath it.
 *
 * A logged-out click redirects to signup/login instead of toggling,
 * returning to the current page afterwards (same pattern as the
 * "contact provider" action on ListingPage).
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.listingId the listing's UUID
 * @param {propTypes.currentUser} [props.currentUser]
 * @param {boolean} props.isFavorite whether this listing is already favorited
 * @param {boolean} [props.inProgress] whether a toggle request for this listing is in flight
 * @param {Function} props.onToggleFavorite (listingId) => Promise
 * @returns {JSX.Element}
 */
const FavoriteButton = props => {
  const {
    className,
    rootClassName,
    listingId,
    currentUser,
    isFavorite,
    inProgress = false,
    onToggleFavorite,
  } = props;

  const history = useHistory();
  const location = useLocation();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();

  const classes = classNames(rootClassName || css.root, className, {
    [css.isFavorite]: isFavorite,
  });

  const handleClick = e => {
    e.preventDefault();
    e.stopPropagation();

    if (inProgress) {
      return;
    }

    if (!currentUser) {
      const state = { from: `${location.pathname}${location.search}${location.hash}` };
      history.push(createResourceLocatorString('SignupPage', routeConfiguration, {}, {}), state);
      return;
    }

    onToggleFavorite(listingId);
  };

  const labelId = isFavorite
    ? 'FavoriteButton.removeFromFavorites'
    : 'FavoriteButton.addToFavorites';

  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
      title={intl.formatMessage({ id: labelId })}
      aria-label={intl.formatMessage({ id: labelId })}
      aria-pressed={isFavorite}
    >
      {inProgress ? (
        <IconSpinner rootClassName={css.spinner} />
      ) : (
        <IconHeart className={css.icon} isFilled={isFavorite} />
      )}
    </button>
  );
};

export default FavoriteButton;
