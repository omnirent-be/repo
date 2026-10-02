/**
 * Transaction process graph for bookings:
 *   - default-booking
 */

/**
 * Transitions
 *
 * These strings must sync with values defined in Marketplace API,
 * since transaction objects given by API contain info about last transitions.
 * All the actions in API side happen in transitions,
 * so we need to understand what those strings mean.
 */

export const transitions = {
  // When a customer makes a booking to a listing, a transaction is
  // created with the initial request-payment transition.
  // At this transition a PaymentIntent is created by Marketplace API.
  // After this transition, the actual payment must be made on client-side directly to Stripe.
  REQUEST_PAYMENT: 'transition/request-payment',

  // A customer can also initiate a transaction with an inquiry, and
  // then transition that with a request.
  INQUIRE: 'transition/inquire',
  REQUEST_PAYMENT_AFTER_INQUIRY: 'transition/request-payment-after-inquiry',

  // Stripe SDK might need to ask 3D security from customer, in a separate front-end step.
  // Therefore we need to make another transition to Marketplace API,
  // to tell that the payment is confirmed.
  CONFIRM_PAYMENT: 'transition/confirm-payment',

  // If the payment is not confirmed in the time limit set in transaction process (by default 15min)
  // the transaction will expire automatically.
  EXPIRE_PAYMENT: 'transition/expire-payment',

  // When the provider accepts or declines a transaction from the
  // SalePage, it is transitioned with the accept or decline transition.
  ACCEPT: 'transition/accept',
  DECLINE: 'transition/decline',

  // The operator can accept or decline the offer on behalf of the provider
  OPERATOR_ACCEPT: 'transition/operator-accept',
  OPERATOR_DECLINE: 'transition/operator-decline',

  // The backend automatically expire the transaction.
  EXPIRE: 'transition/expire',

  // Admin can also cancel the transition.
  CANCEL: 'transition/cancel',

  // The backend will mark the transaction completed.
  COMPLETE: 'transition/complete',
  OPERATOR_COMPLETE: 'transition/operator-complete',

  // Reviews are given through transaction transitions. Review 1 can be
  // by provider or customer, and review 2 will be the other party of
  // the transaction.
  REVIEW_1_BY_PROVIDER: 'transition/review-1-by-provider',
  REVIEW_2_BY_PROVIDER: 'transition/review-2-by-provider',
  REVIEW_1_BY_CUSTOMER: 'transition/review-1-by-customer',
  REVIEW_2_BY_CUSTOMER: 'transition/review-2-by-customer',
  EXPIRE_CUSTOMER_REVIEW_PERIOD: 'transition/expire-customer-review-period',
  EXPIRE_PROVIDER_REVIEW_PERIOD: 'transition/expire-provider-review-period',
  EXPIRE_REVIEW_PERIOD: 'transition/expire-review-period',

  // A customer can request one or more extra days on an already accepted
  // booking. Unlike a plain protectedData change, this needs its own real
  // booking (calendar reservation) - Sharetribe's update-booking action
  // re-validates a transaction's ENTIRE range on every call, including the
  // part it already owns, so it can't be used to grow an already-accepted
  // booking without conflicting with itself. So the extra day is a
  // genuinely separate, linked transaction on the extra-day-payment
  // process (server/api/extra-day/request.js creates it), with its own
  // booking, its own Stripe payment, and its own provider accept/decline -
  // all plain (non-privileged) transitions on that transaction, called
  // directly via the SDK (see TransactionPage.duck.js's
  // acceptExtraDay/declineExtraDay/confirmExtraDayPayment). These
  // self-loop transitions on the MAIN transaction only mirror that
  // sub-transaction's status onto protectedData here, so it's visible on
  // the original booking.
  // PROVIDER_SET_EXTRA_DAY_PRICE is unused (manual pricing was replaced by
  // automatic pricing) but left defined in process.edn since transactions
  // already using it can't have their process definition retroactively
  // trimmed.
  REQUEST_EXTRA_DAY: 'transition/request-extra-day',
  PROVIDER_SET_EXTRA_DAY_PRICE: 'transition/provider-set-extra-day-price',
  CANCEL_EXTRA_DAY_REQUEST: 'transition/cancel-extra-day-request',
  ACCEPT_EXTRA_DAY: 'transition/accept-extra-day',
  DECLINE_EXTRA_DAY: 'transition/decline-extra-day',
  LINK_EXTRA_DAY_PAYMENT: 'transition/link-extra-day-payment',
  CONFIRM_EXTRA_DAY_PAID: 'transition/confirm-extra-day-paid',

  // Security deposit ("borg"). The actual hold/refund/payout happens on a
  // separate, linked deposit-hold transaction (see server/api/deposit/*.js
  // and ext/transaction-processes/deposit-hold). These self-loop
  // transitions only mirror that outcome onto protectedData here, so the
  // deposit's status is visible on the booking itself. Since the provider
  // may release or claim the deposit any time after the booking is
  // delivered (not necessarily while still "accepted"), the release/claim
  // transitions are duplicated per reachable state - see process.edn.
  LINK_DEPOSIT_PAYMENT: 'transition/link-deposit-payment',
  CONFIRM_DEPOSIT_HELD: 'transition/confirm-deposit-held',
  RECORD_DEPOSIT_RELEASE: 'transition/record-deposit-release',
  RECORD_DEPOSIT_CLAIM: 'transition/record-deposit-claim',
  LINK_DEPOSIT_PAYMENT_DELIVERED: 'transition/link-deposit-payment-delivered',
  CONFIRM_DEPOSIT_HELD_DELIVERED: 'transition/confirm-deposit-held-delivered',
  RECORD_DEPOSIT_RELEASE_DELIVERED: 'transition/record-deposit-release-delivered',
  RECORD_DEPOSIT_CLAIM_DELIVERED: 'transition/record-deposit-claim-delivered',
  RECORD_DEPOSIT_RELEASE_REVIEWED: 'transition/record-deposit-release-reviewed',
  RECORD_DEPOSIT_CLAIM_REVIEWED: 'transition/record-deposit-claim-reviewed',
};

/**
 * States
 *
 * These constants are only for making it clear how transitions work together.
 * You should not use these constants outside of this file.
 *
 * Note: these states are not in sync with states used transaction process definitions
 *       in Marketplace API. Only last transitions are passed along transaction object.
 */
export const states = {
  INITIAL: 'initial',
  INQUIRY: 'inquiry',
  PENDING_PAYMENT: 'pending-payment',
  PAYMENT_EXPIRED: 'payment-expired',
  PREAUTHORIZED: 'preauthorized',
  DECLINED: 'declined',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  CANCELED: 'canceled',
  DELIVERED: 'delivered',
  REVIEWED: 'reviewed',
  REVIEWED_BY_CUSTOMER: 'reviewed-by-customer',
  REVIEWED_BY_PROVIDER: 'reviewed-by-provider',
};

/**
 * Description of transaction process graph
 *
 * You should keep this in sync with transaction process defined in Marketplace API
 *
 * Note: we don't use yet any state machine library,
 *       but this description format is following Xstate (FSM library)
 *       https://xstate.js.org/docs/
 */
export const graph = {
  // id is defined only to support Xstate format.
  // However if you have multiple transaction processes defined,
  // it is best to keep them in sync with transaction process aliases.
  id: 'default-booking/release-1',

  // This 'initial' state is a starting point for new transaction
  initial: states.INITIAL,

  // States
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.INQUIRE]: states.INQUIRY,
        [transitions.REQUEST_PAYMENT]: states.PENDING_PAYMENT,
      },
    },
    [states.INQUIRY]: {
      on: {
        [transitions.REQUEST_PAYMENT_AFTER_INQUIRY]: states.PENDING_PAYMENT,
      },
    },

    [states.PENDING_PAYMENT]: {
      on: {
        [transitions.EXPIRE_PAYMENT]: states.PAYMENT_EXPIRED,
        [transitions.CONFIRM_PAYMENT]: states.PREAUTHORIZED,
      },
    },

    [states.PAYMENT_EXPIRED]: {},
    [states.PREAUTHORIZED]: {
      on: {
        [transitions.DECLINE]: states.DECLINED,
        [transitions.OPERATOR_DECLINE]: states.DECLINED,
        [transitions.EXPIRE]: states.EXPIRED,
        [transitions.ACCEPT]: states.ACCEPTED,
        [transitions.OPERATOR_ACCEPT]: states.ACCEPTED,
      },
    },

    [states.DECLINED]: {},
    [states.EXPIRED]: {},
    [states.ACCEPTED]: {
      on: {
        [transitions.CANCEL]: states.CANCELED,
        [transitions.COMPLETE]: states.DELIVERED,
        [transitions.OPERATOR_COMPLETE]: states.DELIVERED,
        [transitions.REQUEST_EXTRA_DAY]: states.ACCEPTED,
        [transitions.PROVIDER_SET_EXTRA_DAY_PRICE]: states.ACCEPTED,
        [transitions.CANCEL_EXTRA_DAY_REQUEST]: states.ACCEPTED,
        [transitions.ACCEPT_EXTRA_DAY]: states.ACCEPTED,
        [transitions.DECLINE_EXTRA_DAY]: states.ACCEPTED,
        [transitions.LINK_EXTRA_DAY_PAYMENT]: states.ACCEPTED,
        [transitions.CONFIRM_EXTRA_DAY_PAID]: states.ACCEPTED,
        [transitions.LINK_DEPOSIT_PAYMENT]: states.ACCEPTED,
        [transitions.CONFIRM_DEPOSIT_HELD]: states.ACCEPTED,
        [transitions.RECORD_DEPOSIT_RELEASE]: states.ACCEPTED,
        [transitions.RECORD_DEPOSIT_CLAIM]: states.ACCEPTED,
      },
    },

    [states.CANCELED]: {},
    [states.DELIVERED]: {
      on: {
        [transitions.EXPIRE_REVIEW_PERIOD]: states.REVIEWED,
        [transitions.REVIEW_1_BY_CUSTOMER]: states.REVIEWED_BY_CUSTOMER,
        [transitions.REVIEW_1_BY_PROVIDER]: states.REVIEWED_BY_PROVIDER,
        [transitions.LINK_DEPOSIT_PAYMENT_DELIVERED]: states.DELIVERED,
        [transitions.CONFIRM_DEPOSIT_HELD_DELIVERED]: states.DELIVERED,
        [transitions.RECORD_DEPOSIT_RELEASE_DELIVERED]: states.DELIVERED,
        [transitions.RECORD_DEPOSIT_CLAIM_DELIVERED]: states.DELIVERED,
      },
    },

    [states.REVIEWED_BY_CUSTOMER]: {
      on: {
        [transitions.REVIEW_2_BY_PROVIDER]: states.REVIEWED,
        [transitions.EXPIRE_PROVIDER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED_BY_PROVIDER]: {
      on: {
        [transitions.REVIEW_2_BY_CUSTOMER]: states.REVIEWED,
        [transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD]: states.REVIEWED,
      },
    },
    [states.REVIEWED]: {
      on: {
        [transitions.RECORD_DEPOSIT_RELEASE_REVIEWED]: states.REVIEWED,
        [transitions.RECORD_DEPOSIT_CLAIM_REVIEWED]: states.REVIEWED,
      },
    },
  },
};

// Check if a transition is the kind that should be rendered
// when showing transition history (e.g. ActivityFeed)
// The first transition and most of the expiration transitions made by system are not relevant
export const isRelevantPastTransition = transition => {
  return [
    transitions.ACCEPT,
    transitions.OPERATOR_ACCEPT,
    transitions.CANCEL,
    transitions.COMPLETE,
    transitions.OPERATOR_COMPLETE,
    transitions.CONFIRM_PAYMENT,
    transitions.DECLINE,
    transitions.OPERATOR_DECLINE,
    transitions.EXPIRE,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
    transitions.REQUEST_EXTRA_DAY,
    transitions.PROVIDER_SET_EXTRA_DAY_PRICE,
    transitions.ACCEPT_EXTRA_DAY,
    transitions.DECLINE_EXTRA_DAY,
    transitions.CONFIRM_EXTRA_DAY_PAID,
    transitions.CONFIRM_DEPOSIT_HELD,
    transitions.CONFIRM_DEPOSIT_HELD_DELIVERED,
    transitions.RECORD_DEPOSIT_RELEASE,
    transitions.RECORD_DEPOSIT_RELEASE_DELIVERED,
    transitions.RECORD_DEPOSIT_RELEASE_REVIEWED,
    transitions.RECORD_DEPOSIT_CLAIM,
    transitions.RECORD_DEPOSIT_CLAIM_DELIVERED,
    transitions.RECORD_DEPOSIT_CLAIM_REVIEWED,
  ].includes(transition);
};

// Processes might be different on how reviews are handled.
// Default processes use two-sided diamond shape, where either party can make the review first
export const isCustomerReview = transition => {
  return [transitions.REVIEW_1_BY_CUSTOMER, transitions.REVIEW_2_BY_CUSTOMER].includes(transition);
};

// Processes might be different on how reviews are handled.
// Default processes use two-sided diamond shape, where either party can make the review first
export const isProviderReview = transition => {
  return [transitions.REVIEW_1_BY_PROVIDER, transitions.REVIEW_2_BY_PROVIDER].includes(transition);
};

// Check if the given transition is privileged.
//
// Privileged transitions need to be handled from a secure context,
// i.e. the backend. This helper is used to check if the transition
// should go through the local API endpoints, or if using JS SDK is
// enough.
export const isPrivileged = transition => {
  return [
    transitions.REQUEST_PAYMENT,
    transitions.REQUEST_PAYMENT_AFTER_INQUIRY,
    // REQUEST_EXTRA_DAY and PROVIDER_SET_EXTRA_DAY_PRICE are unused (see
    // the comment above their definitions) but left here for transactions
    // still bound to older process versions that used them.
    transitions.REQUEST_EXTRA_DAY,
    transitions.PROVIDER_SET_EXTRA_DAY_PRICE,
  ].includes(transition);
};

// Check when transaction is completed (booking over)
export const isCompleted = transition => {
  const txCompletedTransitions = [
    transitions.COMPLETE,
    transitions.OPERATOR_COMPLETE,
    transitions.REVIEW_1_BY_CUSTOMER,
    transitions.REVIEW_1_BY_PROVIDER,
    transitions.REVIEW_2_BY_CUSTOMER,
    transitions.REVIEW_2_BY_PROVIDER,
    transitions.EXPIRE_REVIEW_PERIOD,
    transitions.EXPIRE_CUSTOMER_REVIEW_PERIOD,
    transitions.EXPIRE_PROVIDER_REVIEW_PERIOD,
  ];
  return txCompletedTransitions.includes(transition);
};

// Check when transaction is refunded (booking did not happen)
// In these transitions action/stripe-refund-payment is called
export const isRefunded = transition => {
  const txRefundedTransitions = [
    transitions.EXPIRE_PAYMENT,
    transitions.EXPIRE,
    transitions.CANCEL,
    transitions.DECLINE,
  ];
  return txRefundedTransitions.includes(transition);
};

export const statesNeedingProviderAttention = [states.PREAUTHORIZED];
