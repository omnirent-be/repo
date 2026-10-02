import { states } from '../transactions/transactionProcessNegotiation';

// Structured details of a quote request / offer. They live in the
// transaction's protectedData (visible only to the two parties), next to the
// free-text messages the negotiation process already stores there.
export const DELIVERY_PREFERENCES = ['either', 'pickup', 'delivery'];
export const OFFER_DELIVERY_OPTIONS = ['pickup', 'included', 'extra'];

const trimmed = value => (typeof value === 'string' ? value.trim() : value);

export const pickQuoteRequestData = values => {
  const { quoteEventDate, quoteEventCity, quoteDelivery, quoteBudget } = values || {};
  const quoteRequest = {
    ...(quoteEventDate ? { eventDate: quoteEventDate } : {}),
    ...(trimmed(quoteEventCity) ? { eventCity: trimmed(quoteEventCity) } : {}),
    ...(quoteDelivery ? { delivery: quoteDelivery } : {}),
    ...(trimmed(quoteBudget) ? { budget: trimmed(quoteBudget) } : {}),
  };
  return Object.keys(quoteRequest).length > 0 ? { quoteRequest } : {};
};

// A quote a provider drafts holds for 48h by default (see
// QuoteOfferFields in QuoteSystem.js) - shown as a placeholder there, and
// applied here if the provider didn't override it with their own date.
export const DEFAULT_QUOTE_VALIDITY_HOURS = 48;

export const getDefaultQuoteExpiryIso = () => {
  const expiry = new Date(Date.now() + DEFAULT_QUOTE_VALIDITY_HOURS * 60 * 60 * 1000);
  return expiry.toISOString().slice(0, 10);
};

export const pickQuoteOfferData = values => {
  const { quoteValidUntil, quoteOfferDelivery, quoteTransportFee, quoteDeposit } = values || {};
  const quoteOffer = {
    validUntil: quoteValidUntil || getDefaultQuoteExpiryIso(),
    ...(quoteOfferDelivery ? { delivery: quoteOfferDelivery } : {}),
    // Transport fee is added into offerInSubunits (the actual charged
    // total) by the caller - kept here too so it can be broken back out
    // for display (see QuoteOfferSummary). Deposit is NOT charged or held
    // anywhere yet - this only records what the provider communicated to
    // the customer, since default-negotiation has no deposit-hold step
    // (unlike the daily-rental booking process). Extending the .edn
    // process to actually hold it is a separate, deliberately out-of-scope
    // change - flagged to the user rather than silently implied here.
    ...(quoteTransportFee?.amount != null
      ? { transportFeeInSubunits: quoteTransportFee.amount }
      : {}),
    ...(quoteDeposit?.amount != null ? { depositInSubunits: quoteDeposit.amount } : {}),
  };
  return { quoteOffer };
};

// The five phases a customer sees, and which process states belong to them.
export const QUOTE_STEPS = ['request', 'offer', 'payment', 'execution', 'done'];

const STEP_BY_STATE = {
  [states.INQUIRY]: 0,
  [states.QUOTE_REQUESTED]: 0,
  [states.OFFER_PENDING]: 1,
  [states.CUSTOMER_OFFER_PENDING]: 1,
  [states.UPDATE_PENDING]: 1,
  [states.PENDING_PAYMENT]: 2,
  [states.OFFER_ACCEPTED]: 3,
  [states.DELIVERED]: 3,
  [states.CHANGES_REQUESTED]: 3,
  [states.COMPLETED]: 4,
  [states.REVIEWED_BY_CUSTOMER]: 4,
  [states.REVIEWED_BY_PROVIDER]: 4,
  [states.REVIEWED]: 4,
};

const ENDED_STATES = [
  states.REQUEST_REJECTED,
  states.OFFER_REJECTED,
  states.CANCELED,
  states.PAYMENT_EXPIRED,
];

// Who has to act next, per state. 'none' = nobody (finished or ended).
const TURN_BY_STATE = {
  [states.INQUIRY]: 'provider',
  [states.QUOTE_REQUESTED]: 'provider',
  [states.OFFER_PENDING]: 'customer',
  [states.CUSTOMER_OFFER_PENDING]: 'provider',
  [states.UPDATE_PENDING]: 'customer',
  [states.PENDING_PAYMENT]: 'customer',
  [states.OFFER_ACCEPTED]: 'provider',
  [states.DELIVERED]: 'customer',
  [states.CHANGES_REQUESTED]: 'provider',
};

export const getQuoteProgress = processState => {
  if (ENDED_STATES.includes(processState)) {
    return { ended: true, endedKey: processState };
  }
  const stepIndex = STEP_BY_STATE[processState];
  return typeof stepIndex === 'number'
    ? { ended: false, stepIndex, turn: TURN_BY_STATE[processState] || 'none' }
    : null;
};
