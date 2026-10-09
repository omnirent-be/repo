import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import { Heading } from '../../components';

import css from './SectionRentalDetailsMaybe.module.css';

const CONDITION_MESSAGE_IDS = {
  new: 'SectionRentalDetailsMaybe.conditionNew',
  good: 'SectionRentalDetailsMaybe.conditionGood',
  'light-wear': 'SectionRentalDetailsMaybe.conditionLightWear',
};

/**
 * Shows the rental-specific facts collected in EditListingRentalDetailsForm.js
 * (toebehoren, staat, aantal beschikbaar) on the public listing page - these
 * are plain hardcoded publicData fields, not Console-configured listing
 * fields, so CustomListingFields.js/CustomExtendedDataSection never picked
 * them up. Before this, a renter had no way to see them pre-booking even
 * though the provider had already filled them in.
 *
 * Toebehoren (free text) renders as a plain "Beschrijving" paragraph: staat
 * and aantal (structured facts) render as a "Kenmerken" label/value list.
 * Both reuse the same heading/row styling as CustomExtendedDataSection's own
 * "Details" section right below them, so they blend in with the rest of the
 * listing page instead of introducing a competing visual style.
 *
 * No icons/emoji here by design - see the conversation this was built in.
 *
 * replacementValue and serialNumber are deliberately NOT shown here - both
 * are collected specifically for the rental contract (see
 * server/api-util/contractPdf.js), not as a renter-facing decision detail.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.publicData
 * @returns {JSX.Element|null}
 */
const SectionRentalDetailsMaybe = props => {
  const { publicData } = props;
  const { accessories, condition, totalQuantity } = publicData || {};

  const hasAccessories = typeof accessories === 'string' && accessories.trim().length > 0;
  const conditionMessageId = CONDITION_MESSAGE_IDS[condition];
  const hasQuantity = Number.isInteger(totalQuantity) && totalQuantity > 0;
  const hasFeatures = !!conditionMessageId || hasQuantity;

  if (!hasAccessories && !hasFeatures) {
    return null;
  }

  return (
    <>
      {hasAccessories ? (
        <section className={css.root}>
          <Heading as="h2" rootClassName={css.heading}>
            <FormattedMessage id="SectionRentalDetailsMaybe.descriptionHeading" />
          </Heading>
          <p className={css.descriptionText}>{accessories}</p>
        </section>
      ) : null}
      {hasFeatures ? (
        <section className={css.root}>
          <Heading as="h2" rootClassName={css.heading}>
            <FormattedMessage id="SectionRentalDetailsMaybe.featuresHeading" />
          </Heading>
          <ul className={css.specList}>
            {conditionMessageId ? (
              <li className={css.specRow}>
                <span className={css.specLabel}>
                  <FormattedMessage id="SectionRentalDetailsMaybe.conditionLabel" />
                </span>
                <span>
                  <FormattedMessage id={conditionMessageId} />
                </span>
              </li>
            ) : null}
            {hasQuantity ? (
              <li className={css.specRow}>
                <span className={css.specLabel}>
                  <FormattedMessage id="SectionRentalDetailsMaybe.quantityLabel" />
                </span>
                <span>
                  <FormattedMessage
                    id="SectionRentalDetailsMaybe.quantityValue"
                    values={{ count: totalQuantity }}
                  />
                </span>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </>
  );
};

export default SectionRentalDetailsMaybe;
