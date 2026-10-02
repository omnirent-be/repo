import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { getListingHealthScore } from './listingHealthScore';

import css from './ListingHealthScoreBar.module.css';

/**
 * Shown above the wizard tabs for default-booking's new-listing flow (see
 * EditListingWizard.js) - a small, purely informational completion bar
 * with a tip for the single biggest gap. Never blocks anything; each
 * step's own required-field validation is what actually gates submission.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.listing
 * @returns {JSX.Element}
 */
const ListingHealthScoreBar = props => {
  const { listing } = props;
  const { percentage, tipId } = getListingHealthScore(listing);

  return (
    <div className={css.root}>
      <div className={css.barTrack}>
        <div className={css.barFill} style={{ width: `${percentage}%` }} />
      </div>
      <p className={css.text}>
        <FormattedMessage id="ListingHealthScore.percentage" values={{ percentage }} />
        {tipId ? (
          <>
            {' '}
            <FormattedMessage id={tipId} />
          </>
        ) : null}
      </p>
    </div>
  );
};

export default ListingHealthScoreBar;
