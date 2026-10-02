import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './AccountSetupChecklist.module.css';

const DISMISS_KEY = 'omnirent.accountSetup.dismissed';

const readDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch (e) {
    return false;
  }
};

const AccountSetupChecklistComponent = props => {
  const { currentUser, currentUserHasListings } = props;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  if (!currentUser?.id || dismissed) {
    return null;
  }

  const steps = [
    {
      id: 'email',
      done: !!currentUser.attributes?.emailVerified,
      linkName: 'ContactDetailsPage',
    },
    {
      id: 'photo',
      done: !!currentUser.profileImage,
      linkName: 'ProfileSettingsPage',
    },
    {
      id: 'listing',
      done: !!currentUserHasListings,
      linkName: 'NewListingPage',
    },
    {
      id: 'payout',
      done: !!currentUser.stripeAccount,
      linkName: 'StripePayoutPage',
    },
  ];
  const doneCount = steps.filter(step => step.done).length;
  if (doneCount === steps.length) {
    return null;
  }
  const nextStepId = steps.find(step => !step.done).id;

  const onDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch (e) {
      // ignore: the card simply comes back next visit
    }
    setDismissed(true);
  };

  return (
    <section className={css.root} aria-labelledby="account-setup-title">
      <div className={css.inner}>
        <div className={css.header}>
          <div>
            <h2 id="account-setup-title" className={css.title}>
              <FormattedMessage id="AccountSetup.title" />
            </h2>
            <p className={css.progressText}>
              <FormattedMessage
                id="AccountSetup.progress"
                values={{ done: doneCount, total: steps.length }}
              />
            </p>
          </div>
          <button type="button" className={css.dismiss} onClick={onDismiss}>
            <FormattedMessage id="AccountSetup.dismiss" />
          </button>
        </div>

        <div className={css.bar}>
          <span className={css.barFill} style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>

        <ul className={css.list}>
          {steps.map(step => (
            <li
              key={step.id}
              className={classNames(css.step, {
                [css.stepDone]: step.done,
                [css.stepNext]: step.id === nextStepId,
              })}
            >
              <span className={css.check} aria-hidden="true">
                {step.done ? '✓' : ''}
              </span>
              <span className={css.stepBody}>
                <strong className={css.stepTitle}>
                  <FormattedMessage id={`AccountSetup.step.${step.id}.title`} />
                </strong>
                <span className={css.stepText}>
                  <FormattedMessage id={`AccountSetup.step.${step.id}.text`} />
                </span>
              </span>
              {!step.done ? (
                <NamedLink name={step.linkName} className={css.stepCta}>
                  <FormattedMessage id={`AccountSetup.step.${step.id}.cta`} />
                </NamedLink>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const mapStateToProps = state => {
  const { currentUser, currentUserHasListings } = state.user;
  return { currentUser, currentUserHasListings };
};

export default connect(mapStateToProps)(AccountSetupChecklistComponent);
