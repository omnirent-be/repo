import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import IconReviewStar from '../IconReviewStar/IconReviewStar';

import css from './ExternalReviewBadge.module.css';

const SOURCE_LABELS = {
  google: 'Google',
  facebook: 'Facebook',
  trustpilot: 'Trustpilot',
};

/**
 * Shows a provider's self-reported external review score (e.g. "4.8 op
 * Google (27)") - a bridge for providers who already have a reputation
 * elsewhere but not enough completed bookings yet to have native reviews
 * on the marketplace itself. Renders nothing if there's no rating.
 *
 * @component
 * @param {Object} props
 * @param {Object|null} props.externalReview - { rating, source, count, url }
 * @param {string?} props.className
 * @returns {JSX.Element|null}
 */
const ExternalReviewBadge = props => {
  const { externalReview, rootClassName, className } = props;

  if (!externalReview?.rating) {
    return null;
  }

  const { rating, source, count, url } = externalReview;
  const sourceLabel = SOURCE_LABELS[source] || null;
  const classes = classNames(rootClassName || css.root, className);

  const content = (
    <>
      <IconReviewStar className={css.star} isFilled />
      <span className={css.rating}>{rating}</span>
      {sourceLabel ? (
        <span className={css.detail}>
          <FormattedMessage id="ExternalReviewBadge.onSource" values={{ source: sourceLabel }} />
        </span>
      ) : null}
      {count > 0 ? (
        <span className={css.count}>
          <FormattedMessage id="ExternalReviewBadge.count" values={{ count }} />
        </span>
      ) : null}
    </>
  );

  return url ? (
    <a className={classes} href={url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  );
};

export default ExternalReviewBadge;
