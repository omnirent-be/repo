import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import * as validators from '../../util/validators';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import appSettings from '../../config/settings';
import {
  DELIVERY_PREFERENCES,
  OFFER_DELIVERY_OPTIONS,
  QUOTE_STEPS,
  DEFAULT_QUOTE_VALIDITY_HOURS,
  getQuoteProgress,
} from '../../util/quote';

import FieldSelect from '../FieldSelect/FieldSelect';
import FieldTextInput from '../FieldTextInput/FieldTextInput';
import FieldCurrencyInput from '../FieldCurrencyInput/FieldCurrencyInput';

import css from './QuoteSystem.module.css';

const { Money } = sdkTypes;

const todayIso = () => new Date().toISOString().slice(0, 10);

const formatDate = (intl, isoDate) => {
  const date = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : intl.formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * "So it goes from here" - sets expectations before the customer sends a
 * request. Only describes what the negotiation process really does.
 */
export const QuoteExpectations = ({ className }) => (
  <div className={classNames(css.expectations, className)}>
    <h2 className={css.blockTitle}>
      <FormattedMessage id="QuoteSystem.expect.title" />
    </h2>
    <ol className={css.expectList}>
      {[1, 2, 3, 4].map(n => (
        <li key={n} className={css.expectItem}>
          <span className={css.expectNumber}>{n}</span>
          <span>
            <strong>
              <FormattedMessage id={`QuoteSystem.expect.step${n}.title`} />
            </strong>{' '}
            <FormattedMessage id={`QuoteSystem.expect.step${n}.text`} />
          </span>
        </li>
      ))}
    </ol>
  </div>
);

/**
 * Structured request details for the customer's quote request form.
 * Values are named quote* so they don't clash with custom transaction fields.
 */
export const QuoteRequestFields = ({ formId = 'QuoteRequest' }) => {
  const intl = useIntl();
  const required = id => validators.required(intl.formatMessage({ id }));

  return (
    <div className={css.fields}>
      <div className={css.fieldRow}>
        <FieldTextInput
          id={`${formId}.eventDate`}
          name="quoteEventDate"
          type="date"
          min={todayIso()}
          label={intl.formatMessage({ id: 'QuoteSystem.request.date' })}
          validate={required('QuoteSystem.request.dateRequired')}
        />
        <FieldTextInput
          id={`${formId}.eventCity`}
          name="quoteEventCity"
          type="text"
          autoComplete="address-level2"
          label={intl.formatMessage({ id: 'QuoteSystem.request.city' })}
          placeholder={intl.formatMessage({ id: 'QuoteSystem.request.cityPlaceholder' })}
          validate={required('QuoteSystem.request.cityRequired')}
        />
      </div>
      <div className={css.fieldRow}>
        <FieldSelect
          id={`${formId}.delivery`}
          name="quoteDelivery"
          label={intl.formatMessage({ id: 'QuoteSystem.request.delivery' })}
        >
          {DELIVERY_PREFERENCES.map(option => (
            <option key={option} value={option}>
              {intl.formatMessage({ id: `QuoteSystem.request.delivery.${option}` })}
            </option>
          ))}
        </FieldSelect>
        <FieldTextInput
          id={`${formId}.budget`}
          name="quoteBudget"
          type="text"
          inputMode="numeric"
          label={intl.formatMessage({ id: 'QuoteSystem.request.budget' })}
          placeholder={intl.formatMessage({ id: 'QuoteSystem.request.budgetPlaceholder' })}
        />
      </div>
    </div>
  );
};

/**
 * Extra offer details for the provider: the rental price's transport/
 * service fee and deposit, how long the offer holds, and how delivery is
 * handled. The rental price itself is the existing "quote" field.
 *
 * @param {string} [formId]
 * @param {string} marketplaceCurrency
 */
export const QuoteOfferFields = ({ formId = 'QuoteOffer', marketplaceCurrency }) => {
  const intl = useIntl();
  const currencyConfig = appSettings.getCurrencyFormatting(marketplaceCurrency);
  return (
    <div className={css.fields}>
      <div className={css.fieldRow}>
        <FieldCurrencyInput
          id={`${formId}.transportFee`}
          name="quoteTransportFee"
          label={intl.formatMessage({ id: 'QuoteSystem.offer.transportFee' })}
          placeholder={intl.formatMessage({ id: 'QuoteSystem.offer.transportFeePlaceholder' })}
          currencyConfig={currencyConfig}
        />
        <FieldCurrencyInput
          id={`${formId}.deposit`}
          name="quoteDeposit"
          label={intl.formatMessage({ id: 'QuoteSystem.offer.deposit' })}
          placeholder={intl.formatMessage({ id: 'QuoteSystem.offer.depositPlaceholder' })}
          currencyConfig={currencyConfig}
        />
      </div>
      <p className={css.fieldHint}>
        <FormattedMessage id="QuoteSystem.offer.depositHint" />
      </p>
      <div className={css.fieldRow}>
        <FieldTextInput
          id={`${formId}.validUntil`}
          name="quoteValidUntil"
          type="date"
          min={todayIso()}
          label={intl.formatMessage({ id: 'QuoteSystem.offer.validUntil' })}
          placeholder={intl.formatMessage(
            { id: 'QuoteSystem.offer.validUntilPlaceholder' },
            { hours: DEFAULT_QUOTE_VALIDITY_HOURS }
          )}
        />
        <FieldSelect
          id={`${formId}.delivery`}
          name="quoteOfferDelivery"
          label={intl.formatMessage({ id: 'QuoteSystem.offer.delivery' })}
        >
          {OFFER_DELIVERY_OPTIONS.map(option => (
            <option key={option} value={option}>
              {intl.formatMessage({ id: `QuoteSystem.offer.delivery.${option}` })}
            </option>
          ))}
        </FieldSelect>
      </div>
      <p className={css.fieldHint}>
        <FormattedMessage
          id="QuoteSystem.offer.validUntilHint"
          values={{ hours: DEFAULT_QUOTE_VALIDITY_HOURS }}
        />
      </p>
    </div>
  );
};

const SummaryRow = ({ labelId, children }) => (
  <div className={css.summaryRow}>
    <dt className={css.summaryLabel}>
      <FormattedMessage id={labelId} />
    </dt>
    <dd className={css.summaryValue}>{children}</dd>
  </div>
);

/**
 * Read-only summary of the customer's structured request, shown to both
 * parties (and to the provider while writing the offer).
 */
export const QuoteRequestSummary = ({ protectedData, className }) => {
  const intl = useIntl();
  const request = protectedData?.quoteRequest;
  if (!request) {
    return null;
  }
  const { eventDate, eventCity, delivery, budget } = request;
  return (
    <div className={classNames(css.summary, className)}>
      <h2 className={css.blockTitle}>
        <FormattedMessage id="QuoteSystem.summary.requestTitle" />
      </h2>
      <dl className={css.summaryList}>
        {eventDate ? (
          <SummaryRow labelId="QuoteSystem.request.date">{formatDate(intl, eventDate)}</SummaryRow>
        ) : null}
        {eventCity ? <SummaryRow labelId="QuoteSystem.request.city">{eventCity}</SummaryRow> : null}
        {delivery ? (
          <SummaryRow labelId="QuoteSystem.request.delivery">
            <FormattedMessage id={`QuoteSystem.request.delivery.${delivery}`} />
          </SummaryRow>
        ) : null}
        {budget ? (
          <SummaryRow labelId="QuoteSystem.request.budget">
            {/^[\d.,\s]+$/.test(budget) ? `€ ${budget}` : budget}
          </SummaryRow>
        ) : null}
      </dl>
    </div>
  );
};

/**
 * Read-only summary of the provider's offer details (transport fee,
 * deposit, validity, delivery).
 *
 * @param {Object} protectedData
 * @param {string} [className]
 * @param {string} [marketplaceCurrency] - needed to format transportFeeInSubunits/
 *   depositInSubunits back into money; summary just omits those two rows
 *   without it.
 */
export const QuoteOfferSummary = ({ protectedData, className, marketplaceCurrency }) => {
  const intl = useIntl();
  const offer = protectedData?.quoteOffer;
  if (!offer) {
    return null;
  }
  const { validUntil, delivery, transportFeeInSubunits, depositInSubunits } = offer;
  const formatSubunits = subunits =>
    marketplaceCurrency != null
      ? formatMoney(intl, new Money(subunits, marketplaceCurrency))
      : null;
  const transportFeeFormatted =
    transportFeeInSubunits != null ? formatSubunits(transportFeeInSubunits) : null;
  const depositFormatted = depositInSubunits != null ? formatSubunits(depositInSubunits) : null;

  return (
    <div className={classNames(css.summary, className)}>
      <h2 className={css.blockTitle}>
        <FormattedMessage id="QuoteSystem.summary.offerTitle" />
      </h2>
      <dl className={css.summaryList}>
        {transportFeeFormatted ? (
          <SummaryRow labelId="QuoteSystem.offer.transportFee">{transportFeeFormatted}</SummaryRow>
        ) : null}
        {depositFormatted ? (
          <SummaryRow labelId="QuoteSystem.offer.deposit">{depositFormatted}</SummaryRow>
        ) : null}
        {validUntil ? (
          <SummaryRow labelId="QuoteSystem.offer.validUntil">
            {formatDate(intl, validUntil)}
          </SummaryRow>
        ) : null}
        {delivery ? (
          <SummaryRow labelId="QuoteSystem.offer.delivery">
            <FormattedMessage id={`QuoteSystem.offer.delivery.${delivery}`} />
          </SummaryRow>
        ) : null}
      </dl>
    </div>
  );
};

/**
 * Progress bar for a quote from request to review, plus a plain sentence
 * that says whose turn it is - so nobody has to guess what happens next.
 */
export const QuoteProgress = ({ processState, transactionRole, otherPartyName, className }) => {
  const progress = getQuoteProgress(processState);
  if (!progress) {
    return null;
  }

  if (progress.ended) {
    return (
      <div className={classNames(css.progress, css.progressEnded, className)} role="status">
        <FormattedMessage id={`QuoteSystem.ended.${progress.endedKey}`} />
      </div>
    );
  }

  const { stepIndex, turn } = progress;
  const isYourTurn = turn === transactionRole;
  const turnMessageId =
    turn === 'none' ? 'QuoteSystem.turn.done' : `QuoteSystem.turn.${processState}.${transactionRole}`;

  return (
    <div className={classNames(css.progress, className)}>
      <ol className={css.steps} aria-label="Voortgang">
        {QUOTE_STEPS.map((step, index) => (
          <li
            key={step}
            className={classNames(css.step, {
              [css.stepDone]: index < stepIndex,
              [css.stepCurrent]: index === stepIndex,
            })}
            aria-current={index === stepIndex ? 'step' : undefined}
          >
            <span className={css.stepDot}>{index < stepIndex ? '✓' : index + 1}</span>
            <span className={css.stepLabel}>
              <FormattedMessage id={`QuoteSystem.step.${step}`} />
            </span>
          </li>
        ))}
      </ol>
      <p className={classNames(css.turn, { [css.turnYou]: isYourTurn })}>
        <FormattedMessage id={turnMessageId} values={{ name: otherPartyName || '' }} />
      </p>
    </div>
  );
};
