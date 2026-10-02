import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import IconCheckmark from '../IconCheckmark/IconCheckmark';

import css from './IdentityVerifiedBadge.module.css';

/**
 * "Geverifieerd via itsme" badge for a public profile - see
 * util/identityVerification.js for the itsme scaffold this reads from.
 * Renders nothing today: no signup/login path sets publicData.identityVerifiedVia
 * yet (itsme needs a real OIDC partner account first), but the badge itself
 * and its wiring into ProfilePage.js are ready for when it does.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData - The profile's publicData (from currentUser or another user's profile)
 * @param {string?} props.className
 * @param {string?} props.rootClassName
 * @returns {JSX.Element|null}
 */
const IdentityVerifiedBadge = props => {
  const { publicData, rootClassName, className } = props;

  if (publicData?.identityVerifiedVia !== 'itsme') {
    return null;
  }

  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes}>
      <IconCheckmark className={css.icon} size="small" />
      <span>
        <FormattedMessage id="IdentityVerifiedBadge.verifiedViaItsme" />
      </span>
    </div>
  );
};

export default IdentityVerifiedBadge;
