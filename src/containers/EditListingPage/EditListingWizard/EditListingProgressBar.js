import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { BASICS, RENTAL_DETAILS, PRICING, AVAILABILITY, DELIVERY } from './EditListingWizardTab';

import css from './EditListingProgressBar.module.css';

// Maps the (fine-grained, separately-submitted) booking-process tabs onto
// the 4 visual steps requested for the new listing wizard. Availability
// and Delivery are two separate tabs/forms under the hood (see
// EditListingWizard.js's tabsForListingType and the plan doc) but are
// shown as a single "Locatie & Regels" step here, since visually merging
// them into one form would have meant a much larger, riskier rewrite for
// no real benefit.
const STEP_FOR_TAB = {
  [BASICS]: 1,
  [RENTAL_DETAILS]: 2,
  [PRICING]: 3,
  [AVAILABILITY]: 4,
  [DELIVERY]: 4,
};

const STEP_LABEL_IDS = {
  1: 'EditListingWizard.progressStepBasics',
  2: 'EditListingWizard.progressStepRentalDetails',
  3: 'EditListingWizard.progressStepPricing',
  4: 'EditListingWizard.progressStepRules',
};

const TOTAL_STEPS = 4;

/**
 * A 4-segment progress bar for the booking-process listing wizard (see
 * EditListingWizard.js - only rendered instead of the plain text
 * stepIndicator for default-booking's new-listing flow). Purely visual,
 * not clickable - same non-interactive role the text indicator it replaces
 * already had; the existing Tabs nav below it still handles navigation.
 *
 * @component
 * @param {Object} props
 * @param {string} props.selectedTab - current tab id (see EditListingWizardTab.js)
 * @returns {JSX.Element|null}
 */
const EditListingProgressBar = props => {
  const { selectedTab } = props;
  const currentStep = STEP_FOR_TAB[selectedTab];
  if (!currentStep) {
    return null;
  }

  const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);

  return (
    <div className={css.root}>
      {steps.map(step => {
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <div
            key={step}
            className={classNames(css.step, {
              [css.stepCompleted]: isCompleted,
              [css.stepCurrent]: isCurrent,
            })}
          >
            <span className={css.stepLabel}>
              <FormattedMessage id={STEP_LABEL_IDS[step]} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default EditListingProgressBar;
