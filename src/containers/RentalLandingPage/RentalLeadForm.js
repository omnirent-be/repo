import React, { useState } from 'react';
import { Field, Form as FinalForm } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { sendLead } from '../../util/api';
import { getAttribution } from '../../util/attribution';
import { trackEvent, trackMetaEvent } from '../../util/analytics';
import { composeValidators, emailFormatValid, required } from '../../util/validators';

import { FieldSelect, FieldTextInput, Form, NamedLink, PrimaryButton } from '../../components';

import css from './RentalLandingPage.module.css';

export const LEAD_FORM_ID = 'rental-lead-form';
const CONTACT_EMAIL = 'info@omnirent.be';
const PHONE_CHARS_RE = /^[+()0-9 -]+$/;

const todayIso = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

// Final Form validator: the visitor may leave either a phone number or an e-mail address.
const phoneOrEmail = message => value => {
  const trimmed = (value || '').trim();
  const digitCount = (trimmed.match(/[0-9]/g) || []).length;
  const isPhone = digitCount >= 8 && PHONE_CHARS_RE.test(trimmed);
  const isEmail = emailFormatValid(message)(trimmed) === undefined;
  return isPhone || isEmail ? undefined : message;
};

const buildMailto = (values, pageTitle, pageUrl, itemLabel, attribution) => {
  const subject = `[Aanvraag - ${pageTitle}] ${values.name}`;
  const body = `Naam: ${values.name}\nTelefoon of e-mail: ${values.contact}\nGewenste datum: ${
    values.date
  }\nInteresse: ${itemLabel || '-'}\nPagina: ${pageUrl}\nLandingspagina: ${
    attribution.landingPage
  }\nutm_source: ${attribution.utm_source}\nutm_medium: ${attribution.utm_medium}\nutm_campaign: ${
    attribution.utm_campaign
  }`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body
  )}`;
};

/**
 * Short lead form for the conversion landing pages: name, phone or e-mail, wanted date.
 * It is sent to OmniRent by e-mail (server/api/lead.js). If that fails, for example because
 * e-mail is not configured, it falls back to the visitor's own mail client so a request is
 * never lost. A confirmed send fires the Meta `Lead` event (browser and Conversions API).
 *
 * @component
 * @param {Object} props
 * @param {Object} props.page the landing page entry (see src/util/rentalPages.js)
 * @param {string} props.pageTitle title of the landing page, shown in the e-mail subject
 * @param {string?} props.responsePromise optional promise about the answer speed
 * @param {Array<{id: string, title: string}>?} props.listingOptions listings currently shown on
 *   the page, offered as an optional "which one?" choice - without this, OmniRent had no way to
 *   tell which item a visitor meant when several are shown on the same category page.
 * @returns {JSX.Element}
 */
const RentalLeadForm = props => {
  const { page, pageTitle, responsePromise, listingOptions = [] } = props;
  const intl = useIntl();
  const [sent, setSent] = useState(false);
  const [sentViaMailto, setSentViaMailto] = useState(false);

  const msg = id => intl.formatMessage({ id: `RentalPage.form.${id}` });

  const onSubmit = async values => {
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const selectedListing = listingOptions.find(l => l.id === values.item);
    const itemLabel = values.item === 'other' ? msg('itemOther') : selectedListing?.title;
    // Read back whatever the landing page captured at first touch (util/attribution.js) -
    // by the time the form is submitted the visitor may have clicked into a listing and
    // back, so the current URL's own query string can no longer be trusted for this.
    const attribution = getAttribution();
    try {
      await sendLead({
        name: values.name,
        contact: values.contact,
        date: values.date,
        item: itemLabel,
        pageTitle,
        pageUrl,
        website: values.website,
        attribution,
      });
      setSent(true);
      const eventParams = { content_name: page.id, content_category: page.categoryId };
      trackMetaEvent('Lead', eventParams);
      trackEvent('rental_lead_submitted', { page: page.id });
      // GA4/Google Ads conversion name used by the rental landing pages'
      // #aanvraag form specifically (distinct from rental_lead_submitted,
      // which stays for internal funnel analysis).
      trackEvent('contact_form_sent', { page: page.id, form_id: LEAD_FORM_ID });
    } catch (error) {
      setSentViaMailto(true);
      window.location.href = buildMailto(values, pageTitle, pageUrl, itemLabel, attribution);
    }
  };

  if (sent) {
    return (
      <div className={css.formSuccess} role="status">
        <h2 className={css.formSuccessTitle}>{msg('successTitle')}</h2>
        <p className={css.formSuccessText}>{msg('successText')}</p>
        {responsePromise ? <p className={css.formSuccessText}>{responsePromise}</p> : null}
      </div>
    );
  }

  return (
    <FinalForm
      onSubmit={onSubmit}
      render={({ handleSubmit, submitting }) => (
        <Form className={css.leadForm} onSubmit={handleSubmit} id={LEAD_FORM_ID}>
          <FieldTextInput
            id={`${LEAD_FORM_ID}.name`}
            name="name"
            type="text"
            autoComplete="name"
            label={msg('name')}
            placeholder={msg('namePlaceholder')}
            validate={required(msg('nameRequired'))}
          />
          <FieldTextInput
            id={`${LEAD_FORM_ID}.contact`}
            name="contact"
            type="text"
            autoComplete="email tel"
            label={msg('contact')}
            placeholder={msg('contactPlaceholder')}
            validate={composeValidators(
              required(msg('contactRequired')),
              phoneOrEmail(msg('contactInvalid'))
            )}
          />
          <FieldTextInput
            id={`${LEAD_FORM_ID}.date`}
            name="date"
            type="date"
            min={todayIso()}
            label={msg('date')}
            validate={required(msg('dateRequired'))}
          />
          {listingOptions.length > 0 ? (
            <FieldSelect id={`${LEAD_FORM_ID}.item`} name="item" label={msg('item')}>
              <option value="">{msg('itemPlaceholder')}</option>
              {listingOptions.map(l => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
              <option value="other">{msg('itemOther')}</option>
            </FieldSelect>
          ) : null}
          <Field
            name="website"
            component="input"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className={css.honeypot}
          />
          <PrimaryButton
            type="submit"
            inProgress={submitting}
            disabled={submitting}
            className={css.formSubmit}
          >
            {submitting ? msg('sending') : msg('submit')}
          </PrimaryButton>
          {sentViaMailto ? (
            <p className={css.formNote}>
              <FormattedMessage id="RentalPage.form.mailtoNote" values={{ email: CONTACT_EMAIL }} />
            </p>
          ) : null}
          <p className={css.formNote}>
            <FormattedMessage
              id="RentalPage.form.privacy"
              values={{
                privacyLink: chunks => (
                  <NamedLink name="PrivacyPolicyPage" target="_blank" className={css.formLink}>
                    {chunks}
                  </NamedLink>
                ),
              }}
            />
          </p>
        </Form>
      )}
    />
  );
};

export default RentalLeadForm;
