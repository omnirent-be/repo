import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { FormattedMessage } from '../../../util/reactIntl';
import { fetchRecentReviewsThunk } from '../../../ducks/recentReviews.duck';

import css from './HomepageReviewsSection.module.css';

const IconStar = ({ filled }) => (
  <svg
    className={css.star}
    viewBox="0 0 20 20"
    fill={filled ? 'currentColor' : 'none'}
    aria-hidden="true"
  >
    <path
      d="M10 1.5l2.6 5.6 6.1.6-4.6 4.2 1.3 6L10 14.7l-5.4 3.2 1.3-6-4.6-4.2 6.1-.6L10 1.5z"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * "Wat huurders over OmniRent zeggen" - real, public reviews only (see
 * recentReviews.duck.js). Renders nothing until there's at least one real
 * review to show - never falls back to invented quotes, unlike some of the
 * other homepage sections that have a clearly-labelled generic fallback.
 * Reviews only work as a trust signal when they're genuine (see the
 * conversation this replaced the old example/placeholder cards in).
 *
 * @component
 * @returns {JSX.Element|null}
 */
const HomepageReviewsSection = () => {
  const dispatch = useDispatch();
  const [reviews, setReviews] = useState(null); // null = still loading

  useEffect(() => {
    dispatch(fetchRecentReviewsThunk())
      .unwrap()
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className={css.root}>
      <div className={css.inner}>
        <h2 className={css.heading}>
          <FormattedMessage id="HomepageReviewsSection.heading" />
        </h2>
        <ul className={css.grid}>
          {reviews.map(review => (
            <li className={css.card} key={review.id}>
              <div className={css.stars} aria-hidden="true">
                {[0, 1, 2, 3, 4].map(i => (
                  <IconStar key={i} filled={i < review.rating} />
                ))}
              </div>
              <p className={css.quote}>{review.content}</p>
              <p className={css.author}>
                <span className={css.authorName}>{review.authorName}</span>
                {review.district ? (
                  <>
                    {' • '}
                    <span className={css.district}>{review.district}</span>
                  </>
                ) : null}
              </p>
              {review.listingTitle ? (
                <p className={css.listingTitle}>
                  <FormattedMessage
                    id="HomepageReviewsSection.rentedProduct"
                    values={{ title: review.listingTitle }}
                  />
                </p>
              ) : null}
              <span className={css.verifiedBadge}>
                <FormattedMessage id="HomepageReviewsSection.verifiedBooking" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default HomepageReviewsSection;
