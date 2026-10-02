import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';

import appSettings from '../../config/settings.js';
import * as log from '../../util/log';
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { createResourceLocatorString, findRouteByRouteName } from '../../util/routes';
import {
  LINE_ITEM_OFFER,
  LINE_ITEM_REQUEST,
  LISTING_UNIT_TYPES,
  propTypes,
} from '../../util/types';
import { timestampToDate, getStartOf, parseDateFromISO8601 } from '../../util/dates';
import { createSlug } from '../../util/urlHelpers';
import { requireListingImage } from '../../util/configHelpers';
import { formatContractSignatureMessage } from '../../util/contractSignature';
import { getCurrentUserTypeRoles, hasPermissionToViewData } from '../../util/userHelpers.js';
import { userDisplayNameAsString } from '../../util/data';
import { isMobileSafari } from '../../util/userAgent';

import {
  INQUIRY_PROCESS_NAME,
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  resolveLatestProcessName,
  getProcess,
  isBookingProcess,
  NEGOTIATION_PROCESS_NAME,
  OFFER,
  isPurchaseProcess,
  PURCHASE_PROCESS_NAME,
  isInquiryProcess,
  DOWNLOAD_PROCESS_NAME,
  isDownloadProcess,
} from '../../transactions/transaction';

import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { initializeCardPaymentData } from '../../ducks/stripe.duck.js';

import {
  H4,
  IconSpinner,
  NamedLink,
  NamedRedirect,
  Page,
  UserDisplayName,
  OrderBreakdown,
  OrderPanel,
  LayoutSingleColumn,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import { getStateData } from './TransactionPage.stateData';
import ActionButtons, {
  ACTION_BUTTON_1_ID,
  ACTION_BUTTON_2_ID,
  ACTION_BUTTON_3_ID,
} from './ActionButtons/ActionButtons';
import RequestQuote from './RequestQuote/RequestQuote';
import Offer from './Offer/Offer';
import TransactionFields from './TransactionFields/TransactionFields.js';
import ActivityFeed from './ActivityFeed/ActivityFeed';
import FileAttachments from './FileAttachments/FileAttachments';
import DisputeModal from './DisputeModal/DisputeModal';
import ReportModal from './ReportModal/ReportModal';
import ReviewModal from './ReviewModal/ReviewModal';
import RequestChangesModal from './RequestChangesModal/RequestChangesModal';
import MakeCounterOfferModal from './MakeCounterOfferModal/MakeCounterOfferModal';
import RequestExtraDayModal from './RequestExtraDayModal/RequestExtraDayModal';
import ExtraDayPaymentModal from './ExtraDayPaymentModal/ExtraDayPaymentModal';
import DepositPaymentModal from './DepositPaymentModal/DepositPaymentModal';
import SendMessageForm from './SendMessageForm/SendMessageForm';
import TransactionPanel from './TransactionPanel/TransactionPanel';

import {
  makeTransition,
  sendMessage,
  sendReview,
  fetchMoreMessages,
  fetchTimeSlots,
  fetchTransactionLineItems,
  uploadFile,
  clearUploadedFiles,
  selectFileUploads,
  downloadFile,
  requestExtraDay,
  acceptExtraDay,
  declineExtraDay,
  confirmExtraDayPayment,
  fetchExtraDayTransaction,
  initiateDepositHold,
  confirmDepositHold,
  releaseDeposit,
  claimDeposit,
} from './TransactionPage.duck';
import { confirmCardPayment } from '../../ducks/stripe.duck.js';
import css from './TransactionPage.module.css';

const MAX_MOBILE_SCREEN_WIDTH = 1023;
const SEND_MESSAGE_FORM_ID = 'TransactionPanel.SendMessageForm';

// Submit dispute and close the review modal
const onDisputeOrder = (
  currentTransactionId,
  transitionName,
  onTransition,
  setDisputeSubmitted
) => values => {
  const { disputeReason } = values;
  const params = disputeReason ? { protectedData: { disputeReason } } : {};
  onTransition(currentTransactionId, transitionName, params)
    .then(r => {
      return setDisputeSubmitted(true);
    })
    .catch(e => {
      // Do nothing.
    });
};

// Submit report and close the review modal
const onReportOrder = (
  currentTransactionId,
  transitionName,
  onTransition,
  setReportSubmitted
) => values => {
  const { reportReason } = values;
  const params = reportReason ? { protectedData: { reportReason } } : {};
  onTransition(currentTransactionId, transitionName, params)
    .then(r => {
      return setReportSubmitted(true);
    })
    .catch(e => {
      // Do nothing.
    });
};

// Submit change request, make transition, and send message
const onChangeRequest = (
  currentTransactionId,
  transitionName,
  onTransition,
  onSendMessage,
  config,
  setRequestChangesModalOpen,
  setChangeRequestSubmitted
) => values => {
  const { changeRequestMessage } = values;

  // First make the transition
  onTransition(currentTransactionId, transitionName, {})
    .then(r => {
      // Then send the change request content as a message
      return onSendMessage(currentTransactionId, changeRequestMessage, config);
    })
    .then(r => {
      setRequestChangesModalOpen(false);
      return setChangeRequestSubmitted(true);
    })
    .catch(e => {
      // Do nothing, error will be handled by the form
    });
};

// The booking's start/end are stored as midnight in the *listing's* own
// timezone, not UTC. Reading the calendar date back in that same timezone
// keeps this in sync with both what's displayed to the user (intl.formatDate
// on the same Date, using the browser's local timezone) and the server's
// own timezone-aware comparison in server/api/extra-day/request.js.
const toISODate = (date, timeZone) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(date));

// Submit an extra-day-range request. The price is calculated automatically
// server-side (server/api/extra-day/request.js) and the booking is
// extended in the same call - no waiting on the provider. The resulting
// transition is what shows up in the activity feed (see
// TransactionPage.stateData.js's transitionMessages) - no separate chat
// message is sent for this anymore.
const onRequestExtraDay = (
  currentTransactionId,
  onDispatchRequestExtraDay,
  timeZone,
  setRequestExtraDayModalOpen,
  setRequestExtraDaySubmitted,
  setRequestExtraDayInProgress,
  setRequestExtraDayError,
  setExtraDayPaymentTransaction,
  setExtraDayPaymentModalOpen
) => values => {
  const { dateRange, note } = values;
  const startDate = toISODate(dateRange.startDate, timeZone);
  // The picker's endDate is the last inclusive extra day; the API's
  // bookingEnd (and our own stored endDate) is exclusive, one day later.
  const endDate = toISODate(
    getStartOf(dateRange.endDate, 'day', timeZone, 1, 'days'),
    timeZone
  );

  setRequestExtraDayInProgress(true);
  setRequestExtraDayError(null);
  onDispatchRequestExtraDay(currentTransactionId, startDate, endDate, note || null)
    .then(extraDayTransaction => {
      setRequestExtraDayInProgress(false);
      setRequestExtraDayModalOpen(false);
      setRequestExtraDaySubmitted(true);
      // Move straight into the payment step - the extra-day transaction
      // (its own booking + Stripe payment intent) already exists.
      setExtraDayPaymentTransaction(extraDayTransaction);
      setExtraDayPaymentModalOpen(true);
    })
    .catch(e => {
      setRequestExtraDayInProgress(false);
      setRequestExtraDayError(e);
    });
};

// Submit counter offer, make transition, and send message
const onMakeCounterOffer = (
  currentTransactionId,
  transitionName,
  onTransition,
  transactionRole,
  currency,
  setMakeCounterOfferModalOpen,
  setCounterOfferSubmitted
) => values => {
  const { counterOffer } = values;

  // First make the transition with the counter offer amount
  const params = {
    orderData: {
      actor: transactionRole,
      offerInSubunits: counterOffer.amount, // TODO: get the actual offer in subunits
      currency,
    },
  };

  onTransition(currentTransactionId, transitionName, params)
    .then(r => {
      setMakeCounterOfferModalOpen(false);
      return setCounterOfferSubmitted(true);
    })
    .catch(e => {
      // Do nothing, error will be handled by the form
    });
};

/**
 * Handle navigation to MakeOfferPage. Returns a function that can be used as a form submit handler.
 * Note: this does not yet handle form values, it only navigates to the MakeOfferPage.
 *
 * @param {Object} parameters all the info needed to navigate to MakeOfferPage.
 * @param {Object} parameters.getListing The getListing function from react-router.
 * @param {Object} parameters.params The params object from react-router.
 * @param {Object} parameters.history The history object from react-router.
 * @param {Object} parameters.routes The routes object from react-router.
 * @returns {Function} A function that navigates to MakeOfferPage.
 */
const handleNavigateToMakeOfferPage = parameters => () => {
  const { listing, transaction, history, routes } = parameters;

  history.push(
    createResourceLocatorString(
      'MakeOfferPage',
      routes,
      { id: listing.id.uuid, slug: createSlug(listing.attributes.title) },
      { transactionId: transaction.id.uuid }
    )
  );
};

/**
 * Returns an object with the following properties:
 * - hasValidData: boolean
 * - errorMessageId: string | null
 *
 * This is currently needed for validating offers data in the transaction page.
 *
 * @param {propTypes.transaction} transaction
 * @param {Object} process
 * @param {Object} [process.isValidNegotiationOffersArray]
 * @param {Object} [process.isNegotiationState]
 * @returns {Object} E.g. { hasValidData: true, errorMessageId: null }
 */
const getDataValidationResult = (transaction, process) => {
  const { state, transitions = [], metadata = {} } = transaction?.attributes || {};
  const offers = metadata?.offers || [];

  const hasFn = (property, obj) => !!obj?.[property];
  const isNegotiationState = hasFn('isNegotiationState', process)
    ? process?.isNegotiationState(state)
    : false;

  // With negotiation process, we need to check if the offers array is valid against the transitions array.
  // Note: negotiation state refers to the state where the user can make an offer.
  return hasFn('isValidNegotiationOffersArray', process) && isNegotiationState
    ? {
        hasValidData: process?.isValidNegotiationOffersArray(transitions, offers),
        errorMessageId:
          'TransactionPage.default-negotiation.validation.pastNegotiationOffersInvalid',
      }
    : { hasValidData: true, errorMessageId: null };
};

/**
 * Blocks React Router in-app navigation and browser-level navigation while `when` is true.
 * Registers history.block() for React Router transitions and a beforeunload listener for
 * browser-level events (refresh, tab close). Both are cleaned up when `when` becomes false.
 *
 * @param {boolean} isBlockNavigation - Whether to block navigation
 * @param {Object} history - React Router history object (injected by withRouter)
 * @param {string} message - Confirmation message shown in the React Router prompt dialog
 */
const useUploadNavigationBlock = (isBlockNavigation, history, message) => {
  useEffect(() => {
    if (!isBlockNavigation) {
      return;
    }

    const unblock = history.block(message);

    const handleBeforeUnload = e => {
      e.preventDefault();
      // Included for legacy support, e.g. Chrome/Edge < 119
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unblock();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isBlockNavigation, history, message]);
};

/**
 * TransactionPage handles data loading for Sale and Order views to transaction pages in Inbox.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.params - The path params
 * @param {string} props.params.id - The transaction id
 * @param {PROVIDER|CUSTOMER} props.transactionRole - The transaction role
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.history - The history object
 * @param {Function} props.history.push - The push function
 * @param {Object} props.location - The location object
 * @param {string} props.location.search - The search string
 * @param {propTypes.transaction} props.transaction - The transaction
 * @param {propTypes.error} props.fetchTransactionError - The fetch transaction error
 * @param {Array<propTypes.message>} props.messages - The messages
 * @param {boolean} props.fetchMessagesInProgress - Whether the fetch messages is in progress
 * @param {propTypes.error} props.fetchMessagesError - The fetch messages error
 * @param {number} props.totalMessagePages - The total message pages
 * @param {number} props.oldestMessagePageFetched - The oldest message page fetched
 * @param {boolean} props.sendMessageInProgress - Whether the send message is in progress
 * @param {propTypes.error} props.sendMessageError - The send message error
 * @param {boolean} props.savePaymentMethodFailed - Whether the payment method is saved
 * @param {string} props.transitionInProgress - The transition in progress
 * @param {propTypes.error} props.transitionError - The transition error
 * @param {Object<string, Object>} props.monthlyTimeSlots - The monthly time slots: { '2019-11': { timeSlots: [], fetchTimeSlotsInProgress: false, fetchTimeSlotsError: null } }
 * @param {Object<string, Object>} props.timeSlotsForDate - The time slots for date. E.g. { '2019-11-01': { timeSlots: [], fetchedAt: 1572566400000, fetchTimeSlotsError: null, fetchTimeSlotsInProgress: false } }
 * @param {propTypes.error} props.fetchTimeSlotsError - The fetch time slots error
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items
 * @param {propTypes.error} props.fetchLineItemsError - The fetch line items error
 * @param {boolean} props.fetchLineItemsInProgress - Whether the fetch line items is in progress
 * @param {boolean} props.sendReviewInProgress - Whether the send review is in progress
 * @param {boolean} props.sendReviewError - The send review error
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {Function} props.callSetInitialValues - The call set initial values function
 * @param {Function} props.onInitializeCardPaymentData - The on initialize card payment data function
 * @param {Function} props.onFetchTransactionLineItems - The on fetch transaction line items function
 * @param {Function} props.onManageDisableScrolling - The on manage disable scrolling function
 * @param {Function} props.onSendMessage - The on send message function
 * @param {Function} props.onSendReview - The on send review function
 * @param {Function} props.onShowMoreMessages - The on show more messages function
 * @param {Function} props.onTransition - The on transition function
 * @param {Function} props.onFetchTimeSlots - The on fetch time slots function
 * @param {Array<propTypes.transition>} props.nextTransitions - The next transitions
 * @returns {JSX.Element}
 */
export const TransactionPageComponent = props => {
  const [isDisputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isRequestChangesModalOpen, setRequestChangesModalOpen] = useState(false);
  const [changeRequestSubmitted, setChangeRequestSubmitted] = useState(false);
  const [isMakeCounterOfferModalOpen, setMakeCounterOfferModalOpen] = useState(false);
  const [counterOfferSubmitted, setCounterOfferSubmitted] = useState(false);
  const [isRequestExtraDayModalOpen, setRequestExtraDayModalOpen] = useState(false);
  const [requestExtraDaySubmitted, setRequestExtraDaySubmitted] = useState(false);
  const [requestExtraDayInProgress, setRequestExtraDayInProgress] = useState(false);
  const [requestExtraDayError, setRequestExtraDayError] = useState(null);
  const [isExtraDayPaymentModalOpen, setExtraDayPaymentModalOpen] = useState(false);
  const [extraDayPaymentTransaction, setExtraDayPaymentTransaction] = useState(null);
  const [isDepositPaymentModalOpen, setDepositPaymentModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobileSafariRef = useRef(false);
  useEffect(() => {
    isMobileSafariRef.current = isMobileSafari();
  }, []);

  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    savePaymentMethodFailed = false,
    fetchMessagesError,
    fetchMessagesInProgress,
    totalMessagePages,
    oldestMessagePageFetched,
    fetchTransactionError,
    history,
    messages,
    onManageDisableScrolling,
    onSendMessage,
    onSendReview,
    onShowMoreMessages,
    params,
    scrollingDisabled,
    sendMessageError,
    sendMessageInProgress,
    sendReviewError,
    sendReviewInProgress,
    transaction,
    transactionRole,
    transitionInProgress,
    transitionError,
    onTransition,
    nextTransitions,
    callSetInitialValues,
    onInitializeCardPaymentData,
    onUploadFile,
    fileUploads,
    onClearUploadedFiles,
    onDownloadFile,
    fileDownloads,
    onRequestExtraDay: onDispatchRequestExtraDay,
    onAcceptExtraDay: onDispatchAcceptExtraDay,
    onDeclineExtraDay: onDispatchDeclineExtraDay,
    onConfirmCardPayment,
    onConfirmExtraDayPayment,
    onFetchExtraDayTransaction,
    onInitiateDepositHold,
    onConfirmDepositHold,
    onReleaseDeposit: onDispatchReleaseDeposit,
    onClaimDeposit: onDispatchClaimDeposit,
    fileUploadsDisabled,
    monthlyTimeSlots,
    onFetchTimeSlots,
    ...restOfProps
  } = props;

  const { listing, provider, customer, booking, protectedFileAttachments } = transaction || {};
  const txTransitions = transaction?.attributes?.transitions || [];
  const isProviderRole = transactionRole === PROVIDER;
  const isCustomerRole = transactionRole === CUSTOMER;

  const processName = resolveLatestProcessName(transaction?.attributes?.processName);
  let process = null;
  try {
    process = processName ? getProcess(processName) : null;
  } catch (error) {
    // Process was not recognized!
  }

  const isTxOnPaymentPending = tx => {
    return process ? process.getState(tx) === process.states.PENDING_PAYMENT : null;
  };

  const redirectToCheckoutPageWithInitialValues = (initialValues, currentListing) => {
    // Customize the state of the CheckoutPage with the current transaction, listing and the selected orderData
    const { setInitialValues } = findRouteByRouteName('CheckoutPage', routeConfiguration);
    callSetInitialValues(setInitialValues, initialValues);

    // Clear previous Stripe errors from store if there is any
    onInitializeCardPaymentData();

    // Redirect to CheckoutPage
    history.push(
      createResourceLocatorString(
        'CheckoutPage',
        routeConfiguration,
        { id: currentListing.id.uuid, slug: createSlug(currentListing.attributes.title) },
        {}
      )
    );
  };

  // If payment is pending, redirect to CheckoutPage
  if (
    transaction?.id &&
    isTxOnPaymentPending(transaction) &&
    isCustomerRole &&
    transaction.attributes.lineItems
  ) {
    // Note: we don't need to pass orderData since those are already saved to transaction.
    //       However, we could do that by extracting the values from transaction entity.
    //
    // const bookingMaybe = booking?.id ? { bookingDates: { bookingStart: booking?.attributes?.start, bookingEnd: booking?.attributes?.end } } : {};
    // const purchaseLineItem = transaction.attributes.lineItems.find(item => item.code === LINE_ITEM_ITEM);
    // const quantity = purchaseLineItem?.quantity?.toNumber();
    // const quantityMaybe = quantity ? { quantity } : {};

    const initialValues = {
      listing,
      // Transaction with payment pending should be passed to CheckoutPage
      transaction,
      // Original orderData content is not available,
      // but it is already saved since tx is in state: payment-pending.
      orderData: {},
    };

    redirectToCheckoutPageWithInitialValues(initialValues, listing);
  }

  // Customer can create a booking, if the tx is in "inquiry" state.
  const handleSubmitOrderRequest = values => {
    const {
      bookingDates,
      bookingStartTime,
      bookingEndTime,
      priceVariantName, // relevant for bookings
      quantity: quantityRaw,
      seats: seatsRaw,
      deliveryMethod,
      ...otherOrderData
    } = values;

    const bookingMaybe = bookingDates
      ? {
          bookingDates: {
            bookingStart: bookingDates.startDate,
            bookingEnd: bookingDates.endDate,
          },
        }
      : bookingStartTime && bookingEndTime
      ? {
          bookingDates: {
            bookingStart: timestampToDate(bookingStartTime),
            bookingEnd: timestampToDate(bookingEndTime),
          },
        }
      : {};

    // priceVariantName is relevant for bookings
    const priceVariantNameMaybe = priceVariantName ? { priceVariantName } : {};
    const quantity = Number.parseInt(quantityRaw, 10);
    const quantityMaybe = Number.isInteger(quantity) ? { quantity } : {};
    const seats = Number.parseInt(seatsRaw, 10);
    const seatsMaybe = Number.isInteger(seats) ? { seats } : {};
    const deliveryMethodMaybe = deliveryMethod ? { deliveryMethod } : {};

    const initialValues = {
      listing,
      // inquired transaction should be passed to CheckoutPage
      transaction,
      orderData: {
        ...bookingMaybe,
        ...priceVariantNameMaybe,
        ...quantityMaybe,
        ...seatsMaybe,
        ...deliveryMethodMaybe,
        ...otherOrderData,
      },
      confirmPaymentError: null,
    };

    redirectToCheckoutPageWithInitialValues(initialValues, listing);
  };

  // Open review modal
  // This is called from ActivityFeed and from action buttons
  const onOpenReviewModal = () => {
    setReviewModalOpen(true);
  };

  // Open change request modal
  // This is called from ActivityFeed and from action buttons
  const onOpenRequestChangesModal = () => {
    setRequestChangesModalOpen(true);
  };

  // Open make counter offer modal
  // This is called from action buttons
  const onOpenMakeCounterOfferModal = () => {
    setMakeCounterOfferModalOpen(true);
  };

  // Open request extra day modal (customer, accepted booking). Fetches
  // availability once for the window right after the current booking end,
  // so the calendar can grey out days already booked by someone else -
  // same underlying time slots machinery as the normal booking calendar.
  const onOpenRequestExtraDayModal = () => {
    const bookingEnd = booking?.attributes?.end;
    const dayCountAvailableForBooking = config.stripe.dayCountAvailableForBooking;
    if (bookingEnd && listing?.id && timeZone) {
      const rangeEnd = getStartOf(bookingEnd, 'day', timeZone, dayCountAvailableForBooking, 'days');
      onFetchTimeSlots(listing.id, bookingEnd, rangeEnd, timeZone);
    }
    setRequestExtraDayModalOpen(true);
  };

  // Re-open the payment modal for an extra-day request that was already
  // created but never confirmed (e.g. the customer closed the modal before
  // entering their card) - re-fetches the existing transaction rather than
  // creating a duplicate one.
  const onOpenExtraDayPaymentModal = () => {
    const extraDay = transaction?.attributes?.protectedData?.extraDay;
    if (!extraDay?.extraDayTransactionId) {
      return;
    }
    onFetchExtraDayTransaction(extraDay.extraDayTransactionId).then(tx => {
      setExtraDayPaymentTransaction(tx);
      setExtraDayPaymentModalOpen(true);
    });
  };

  // Provider accepts a customer's extra-day request. Captures the
  // already-authorized payment on the linked extra-day transaction
  // (a plain, non-privileged transition, called directly - not through
  // onTransition/makeTransition - so it isn't tracked by the shared
  // transitionError state; catch here instead so a failure doesn't end up
  // as a bare unhandled rejection), then syncs the outcome onto the
  // original booking's protectedData.
  const onAcceptExtraDay = () => {
    const extraDay = transaction?.attributes?.protectedData?.extraDay;
    return onDispatchAcceptExtraDay(extraDay?.extraDayTransactionId)
      .then(() => {
        const params = {
          protectedData: { extraDay: { ...extraDay, status: 'accepted' } },
        };
        return onTransition(transaction?.id, process?.transitions?.ACCEPT_EXTRA_DAY, params);
      })
      .catch(e => {
        log.error(e, 'accept-extra-day-failed', { transactionId: transaction?.id?.uuid });
        throw e;
      });
  };

  // Provider declines a customer's extra-day request. Releases the
  // authorization hold on the linked extra-day transaction (customer is
  // never charged), same non-privileged/error-handling considerations as
  // onAcceptExtraDay above.
  const onDeclineExtraDay = () => {
    const extraDay = transaction?.attributes?.protectedData?.extraDay;
    return onDispatchDeclineExtraDay(extraDay?.extraDayTransactionId)
      .then(() => {
        const params = {
          protectedData: { extraDay: { ...extraDay, status: 'declined' } },
        };
        return onTransition(transaction?.id, process?.transitions?.DECLINE_EXTRA_DAY, params);
      })
      .catch(e => {
        log.error(e, 'decline-extra-day-failed', { transactionId: transaction?.id?.uuid });
        throw e;
      });
  };

  // Called once the card is confirmed on the linked extra-day transaction
  // (it's now "preauthorized" - not yet captured, the provider still has
  // to accept it). Uses its own transition (CONFIRM_EXTRA_DAY_PAID,
  // distinct from LINK_EXTRA_DAY_PAYMENT used to start the request) so the
  // activity feed can show a distinct bullet for this exact moment (see
  // TransactionPage.stateData.js's transitionMessages).
  const onExtraDayPaymentSuccess = extraDayTransactionId => {
    const extraDay = transaction?.attributes?.protectedData?.extraDay;
    const params = {
      protectedData: { extraDay: { ...extraDay, status: 'requested', extraDayTransactionId } },
    };

    onTransition(transaction?.id, process?.transitions?.CONFIRM_EXTRA_DAY_PAID, params)
      .then(() => {
        setExtraDayPaymentModalOpen(false);
      })
      .catch(e => {
        setExtraDayPaymentModalOpen(false);
      });
  };

  // Open deposit payment modal (customer, accepted booking)
  const onOpenDepositPaymentModal = () => {
    setDepositPaymentModalOpen(true);
  };

  // Called once the deposit payment fully completes: mark it as held on
  // the original transaction. The customer only ever pays the deposit
  // while the booking is still ACCEPTED (see stateDataBooking.js), so the
  // non-"_delivered" transition is always the right one here.
  const onDepositPaymentSuccess = depositTransactionId => {
    const deposit = transaction?.attributes?.protectedData?.deposit;
    const params = {
      protectedData: { deposit: { ...deposit, status: 'held', depositTransactionId } },
    };

    onTransition(transaction?.id, process?.transitions?.CONFIRM_DEPOSIT_HELD, params)
      .then(() => {
        setDepositPaymentModalOpen(false);
      })
      .catch(e => {
        setDepositPaymentModalOpen(false);
      });
  };

  // Provider releases (fully refunds) a held security deposit. Privileged
  // (calls Stripe refund on the linked deposit-hold transaction), so this
  // goes through the server endpoint rather than onTransition/makeTransition
  // - which also means it isn't tracked by the shared transitionError
  // state, hence the explicit catch/log here.
  const onReleaseDeposit = () => {
    return onDispatchReleaseDeposit(transaction?.id).catch(e => {
      log.error(e, 'release-deposit-failed', { transactionId: transaction?.id?.uuid });
      throw e;
    });
  };

  // Provider claims (fully pays out to themselves) a held security
  // deposit. Same privileged/error-handling considerations as
  // onReleaseDeposit above.
  const onClaimDeposit = () => {
    return onDispatchClaimDeposit(transaction?.id).catch(e => {
      log.error(e, 'claim-deposit-failed', { transactionId: transaction?.id?.uuid });
      throw e;
    });
  };

  // Submit review and close the review modal
  const onSubmitReview = values => {
    const { reviewRating, reviewContent } = values;
    const rating = Number.parseInt(reviewRating, 10);
    const { states, transitions } = process;

    // The download process only supports a single customer-side review transition.
    // Bidirectional review transitions (REVIEW_1/REVIEW_2) don't exist in that process.
    const transitionOptions = isDownloadProcess(processName)
      ? {
          reviewAsFirst: transitions.REVIEW,
          hasOtherPartyReviewedFirst: false,
        }
      : transactionRole === CUSTOMER
      ? {
          reviewAsFirst: transitions.REVIEW_1_BY_CUSTOMER,
          reviewAsSecond: transitions.REVIEW_2_BY_CUSTOMER,
          hasOtherPartyReviewedFirst: process
            .getTransitionsToStates([states.REVIEWED_BY_PROVIDER])
            .includes(transaction.attributes.lastTransition),
        }
      : {
          reviewAsFirst: transitions.REVIEW_1_BY_PROVIDER,
          reviewAsSecond: transitions.REVIEW_2_BY_PROVIDER,
          hasOtherPartyReviewedFirst: process
            .getTransitionsToStates([states.REVIEWED_BY_CUSTOMER])
            .includes(transaction.attributes.lastTransition),
        };
    const params = { reviewRating: rating, reviewContent };

    onSendReview(transaction, transitionOptions, params, config)
      .then(r => {
        setReviewModalOpen(false);
        setReviewSubmitted(true);
      })
      .catch(e => {
        // Do nothing.
      });
  };

  // Open dispute modal
  const onOpenDisputeModal = () => {
    setDisputeModalOpen(true);
  };

  // Open report modal
  const onOpenReportModal = () => {
    setReportModalOpen(true);
  };

  const deletedListingTitle = intl.formatMessage({
    id: 'TransactionPage.deletedListing',
  });
  const listingDeleted = listing?.attributes?.deleted;
  const listingTitle = listingDeleted ? deletedListingTitle : listing?.attributes?.title;

  const isCustomerBanned = !!customer?.attributes?.banned;
  const isCustomerDeleted = !!customer?.attributes?.deleted;
  const isProviderBanned = !!provider?.attributes?.banned;
  const isProviderDeleted = !!provider?.attributes?.deleted;

  // Redirect users with someone else's direct link to their own inbox/sales or inbox/orders page.
  const isDataAvailable =
    process &&
    currentUser &&
    transaction?.id &&
    transaction?.id?.uuid === params.id &&
    transaction?.attributes?.lineItems &&
    transaction.customer &&
    transaction.provider &&
    !fetchTransactionError;

  const isOwnSale = isDataAvailable && isProviderRole && currentUser.id.uuid === provider?.id?.uuid;
  const isOwnOrder =
    isDataAvailable && isCustomerRole && currentUser.id.uuid === customer?.id?.uuid;

  const {
    customer: isCustomerUserTypeRole,
    provider: isProviderUserTypeRole,
  } = getCurrentUserTypeRoles(config, currentUser);

  const validListingTypes = config.listing.listingTypes;
  const foundListingTypeConfig = validListingTypes.find(
    conf => conf.listingType === listing?.attributes?.publicData?.listingType
  );

  // - Access control determines whether file uploads and downloads are allowed
  //   across the marketplace. If an operator disables files while the user is on the page,
  //   an API call error might also set file uploads to disabled in state.
  // - Listing type config determines whether file uploads are enabled for transactions
  //   of the specified listing type.
  const allowFiles =
    !config.accessControl.marketplace.fileUploadAndDownloadDisabled && !fileUploadsDisabled;
  const listingTypeHasFileAttachments = foundListingTypeConfig?.messagingOptions?.fileAttachments;

  const hasUnsentUploads = fileUploads?.length > 0 && allowFiles;
  const blockMessage = intl.formatMessage({
    id: 'TransactionPage.navigationBlockedBeforeFilesSent',
  });
  useUploadNavigationBlock(hasUnsentUploads, history, blockMessage);

  /**
   * SendMessageForm related attributes
   */

  const showSendMessageForm =
    !isCustomerBanned && !isCustomerDeleted && !isProviderBanned && !isProviderDeleted;
  const showAttachFiles = showSendMessageForm && listingTypeHasFileAttachments && allowFiles;

  const currentUserIsCustomer =
    currentUser?.id && customer?.id && currentUser.id.uuid === customer?.id?.uuid;
  const otherUserDisplayNameString = currentUserIsCustomer
    ? userDisplayNameAsString(provider, '')
    : userDisplayNameAsString(customer, '');

  const onUploadFileToPanel = file => {
    if (file) {
      const tempId = `${Date.now()}-${Math.random()}`;
      onUploadFile(file, tempId);
    }
  };

  const onRemoveFileFromPanel = tempId => {
    onClearUploadedFiles([tempId]);
  };

  const onSendMessageFormFocus = () => {
    if (isMobileSafariRef.current) {
      window.scroll({ top: document.body.scrollHeight, left: 0, behavior: 'smooth' });
    }
  };

  const scrollToMessage = messageId => {
    const selector = `#msg-${messageId}`;
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  const onMessageSubmit = (values, form) => {
    const message = values.message ? values.message.trim() : null;
    if (!message) {
      return;
    }
    // By default, the SendMessageForm submit button is disabled if
    // any files are still uploading or have an error. If you make changes to that
    // logic, adjust this logic to filter out pending or failed uploads.
    const fileIds = allowFiles ? fileUploads.map(f => ({ fileId: f.file.id })) : null;
    onSendMessage(transaction.id, message, config, fileIds)
      .then(resp => {
        const messageId = resp.payload.uuid;
        if (messageId) {
          // Only clear the form and files if message id exists i.e.
          // message was successfully sent
          form.reset();
          onClearUploadedFiles(fileUploads.map(f => f.tempId));
          scrollToMessage(messageId);
        }
      })
      .catch(() => {});
  };

  // "Signing" is a specially-marked chat message rather than a new field
  // on the transaction - see src/util/contractSignature.js for why.
  const onSignContract = name =>
    onSendMessage(transaction.id, formatContractSignatureMessage(name), config, null);

  const showListingImage = requireListingImage(foundListingTypeConfig);

  if (isDataAvailable && isProviderRole && !isOwnSale) {
    // If the user's user type does not have a provider role set, redirect
    // to 'orders' inbox tab. Otherwise, redirect to 'sales' tab.
    const tab = !isProviderUserTypeRole ? 'orders' : 'sales';
    console.error('Tried to access a sale that was not owned by the current user');
    return <NamedRedirect name="InboxPage" params={{ tab }} />;
  } else if (isDataAvailable && isCustomerRole && !isOwnOrder) {
    // If the user's user type does not have a customer role set, redirect
    // to 'sales' inbox tab. Otherwise, redirect to 'orders' tab.
    const tab = !isCustomerUserTypeRole ? 'sales' : 'orders';
    console.error('Tried to access an order that was not owned by the current user');
    return <NamedRedirect name="InboxPage" params={{ tab }} />;
  }

  const detailsClassName = classNames(css.tabContent, css.tabContentVisible);

  const fetchErrorMessage = isCustomerRole
    ? 'TransactionPage.fetchOrderFailed'
    : 'TransactionPage.fetchSaleFailed';
  const loadingMessage = isCustomerRole
    ? 'TransactionPage.loadingOrderData'
    : 'TransactionPage.loadingSaleData';

  const loadingOrFailedFetching = fetchTransactionError ? (
    <p className={css.error}>
      <FormattedMessage id={`${fetchErrorMessage}`} />
    </p>
  ) : transaction && !process ? (
    <div className={css.error}>
      <FormattedMessage id="TransactionPage.unknownTransactionProcess" />
    </div>
  ) : (
    <div className={css.loading}>
      <FormattedMessage id={`${loadingMessage}`} />
      <IconSpinner />
    </div>
  );

  const otherUserDisplayName = isOwnOrder ? (
    <UserDisplayName user={provider} intl={intl} />
  ) : (
    <UserDisplayName user={customer} intl={intl} />
  );
  const onMakeOffer = handleNavigateToMakeOfferPage({
    listing,
    transaction,
    history,
    routes: routeConfiguration,
  });

  const stateData = isDataAvailable
    ? getStateData(
        {
          transaction,
          transactionRole,
          nextTransitions,
          transitionInProgress,
          transitionError,
          sendReviewInProgress,
          sendReviewError,
          onTransition,
          onOpenReviewModal,
          onOpenRequestChangesModal,
          onOpenMakeCounterOfferModal,
          onOpenRequestExtraDayModal,
          onOpenExtraDayPaymentModal,
          onAcceptExtraDay,
          onDeclineExtraDay,
          onOpenDepositPaymentModal,
          onReleaseDeposit,
          onClaimDeposit,
          onCheckoutRedirect: handleSubmitOrderRequest,
          onMakeOfferRedirect: onMakeOffer,
          intl,
        },
        process
      )
    : {};

  const hasLineItems = transaction?.attributes?.lineItems?.length > 0;
  const unitLineItem = hasLineItems
    ? transaction.attributes?.lineItems?.find(
        item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
      )
    : null;

  const formatLineItemUnitType = (transaction, listing) => {
    // unitType should always be saved to transaction's protected data
    const unitTypeInProtectedData = transaction?.attributes?.protectedData?.unitType;
    // If unitType is not found (old or mutated data), we check listing's publicData
    // Note: this might have changed over time
    const unitTypeInListingPublicData = listing?.attributes?.publicData?.unitType;
    return `line-item/${unitTypeInProtectedData || unitTypeInListingPublicData}`;
  };

  const lineItemUnitType = unitLineItem
    ? unitLineItem.code
    : isDataAvailable
    ? formatLineItemUnitType(transaction, listing)
    : null;

  const timeZone = listing?.attributes?.availabilityPlan?.timezone;

  const extraDay = transaction?.attributes?.protectedData?.extraDay;
  const extraDayStartDateObj = extraDay?.startDate
    ? parseDateFromISO8601(extraDay.startDate, timeZone)
    : null;
  const extraDayEndDateObj = extraDay?.endDate
    ? parseDateFromISO8601(extraDay.endDate, timeZone)
    : null;
  const extraDayCount =
    extraDayStartDateObj && extraDayEndDateObj
      ? Math.round((extraDayEndDateObj - extraDayStartDateObj) / (1000 * 60 * 60 * 24))
      : null;

  const hasViewingRights = currentUser && hasPermissionToViewData(currentUser);

  const txBookingMaybe = booking?.id ? { booking, timeZone } : {};
  const orderBreakdownMaybe = hasLineItems
    ? {
        orderBreakdown: (
          <OrderBreakdown
            className={css.breakdown}
            userRole={transactionRole}
            transaction={transaction}
            {...txBookingMaybe}
            currency={config.currency}
            marketplaceName={config.marketplaceName}
          />
        ),
      }
    : {};

  // The location of the booking can be shown once the booking is accepted,
  // provided the listing actually has an address saved. Deliberately not
  // gated on foundListingTypeConfig?.defaultListingFields.location (Console's
  // toggle for Sharetribe's own built-in location field): OmniRent's
  // daily-rental listing type has that off, since the address is instead
  // captured through the custom delivery step's own location field (see
  // EditListingDeliveryForm.js) - gating on that flag here would mean the
  // address never reveals to the renter at all, even after a paid booking.
  const showBookingLocation =
    isBookingProcess(stateData.processName) &&
    process?.hasPassedState(process?.states?.ACCEPTED, transaction) &&
    !!listing?.attributes?.publicData?.location?.address;

  // The rental agreement PDF only makes sense once the booking is actually
  // confirmed (payment captured) - a contract for a still-pending request
  // could describe terms that never happen. Same accepted-or-later check as
  // showBookingLocation above.
  const showContractDownload =
    isBookingProcess(stateData.processName) &&
    process?.hasPassedState(process?.states?.ACCEPTED, transaction);

  const isNegotiationProcess = processName === NEGOTIATION_PROCESS_NAME;
  const isRegularNegotiation =
    isNegotiationProcess && transaction?.attributes?.protectedData?.unitType === OFFER;

  const isCounterpartyInactive =
    (isCustomerRole && (isProviderBanned || isProviderDeleted)) ||
    (isProviderRole && (isCustomerBanned || isCustomerDeleted));

  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobile =
    mounted && hasMatchMedia
      ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
      : true;

  const customTransactionFieldProps = (role = 'customer', isOfferOrRequest = false) => ({
    protectedData: transaction?.attributes.protectedData,
    intl,
    role,
    transactionFieldConfigs: foundListingTypeConfig?.transactionFields,
    isCustomerBanned,
    isProviderBanned,
    isOfferOrRequest,
    processName,
    // isNegotiationProcess,
    // isBookingProcess: isBookingProcess(processName),
    // isPurchaseProcess: processName === PURCHASE_PROCESS_NAME,
    // isDownloadProcess: isDownloadProcess(processName),
    // isInquiryProcess: processName === INQUIRY_PROCESS_NAME,
    isRegularNegotiation,
  });

  const actionButtonContainer = isMobile ? 'mobile' : 'desktop';
  // TransactionPanel is presentational component
  // that currently handles showing everything inside layout's main view area.
  const panel = isDataAvailable ? (
    <TransactionPanel
      className={detailsClassName}
      currentUser={currentUser}
      transactionId={transaction?.id}
      listing={listing}
      customer={customer}
      provider={provider}
      transitions={txTransitions}
      processName={processName}
      protectedData={transaction?.attributes?.protectedData}
      marketplaceName={config.marketplaceName}
      messages={messages}
      savePaymentMethodFailed={savePaymentMethodFailed}
      fetchMessagesError={fetchMessagesError}
      onOpenDisputeModal={onOpenDisputeModal}
      onOpenReportModal={onOpenReportModal}
      stateData={stateData}
      transactionRole={transactionRole}
      showBookingLocation={showBookingLocation}
      showContractDownload={showContractDownload}
      onSignContract={onSignContract}
      sendMessageInProgress={sendMessageInProgress}
      hasViewingRights={hasViewingRights}
      showListingImage={showListingImage}
      sendMessageForm={
        showSendMessageForm ? (
          <SendMessageForm
            formId={SEND_MESSAGE_FORM_ID}
            rootClassName={css.sendMessageForm}
            messagePlaceholder={intl.formatMessage(
              { id: 'TransactionPanel.sendMessagePlaceholder' },
              { name: otherUserDisplayNameString }
            )}
            inProgress={sendMessageInProgress}
            sendMessageError={sendMessageError}
            onFocus={onSendMessageFormFocus}
            onSubmit={onMessageSubmit}
            showAttachFiles={showAttachFiles}
            showDisabledFilesError={listingTypeHasFileAttachments && !allowFiles}
            marketplaceName={config.marketplaceName}
            files={fileUploads}
            onFileUpload={onUploadFileToPanel}
            onRemoveFile={onRemoveFileFromPanel}
            onDownloadFile={onDownloadFile}
          />
        ) : null
      }
      actionButtons={containerId => (
        <ActionButtons
          containerId={containerId}
          listingTypeConfig={foundListingTypeConfig}
          showButtons={stateData.showActionButtons}
          primaryButtonProps={stateData?.primaryButtonProps}
          secondaryButtonProps={stateData?.secondaryButtonProps}
          tertiaryButtonProps={stateData?.tertiaryButtonProps}
          actionButtonOrder={stateData?.actionButtonOrder}
          isListingDeleted={listingDeleted}
          isProvider={isProviderRole}
          transitions={txTransitions}
          {...getDataValidationResult(transaction, process)}
          timeZone={listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC'}
          isCounterpartyInactive={isCounterpartyInactive}
        />
      )}
      fileAttachments={
        <FileAttachments
          isDownloadProcess={isDownloadProcess(processName)}
          allowFiles={!config.accessControl.marketplace.fileUploadAndDownloadDisabled}
          hideFiles={stateData.processState === 'canceled'}
          fileAttachments={protectedFileAttachments}
          onDownloadFile={onDownloadFile}
          fileDownloads={fileDownloads}
          intl={intl}
          marketplaceName={config.marketplaceName}
        />
      }
      activityFeed={
        <ActivityFeed
          messages={messages}
          transaction={transaction}
          stateData={stateData}
          intl={intl}
          currentUser={currentUser}
          hasOlderMessages={
            totalMessagePages > oldestMessagePageFetched && !fetchMessagesInProgress
          }
          onOpenReviewModal={onOpenReviewModal}
          onShowOlderMessages={() => onShowMoreMessages(transaction.id, config)}
          fetchMessagesInProgress={fetchMessagesInProgress}
          allowFiles={allowFiles}
          onDownloadFile={onDownloadFile}
          fileDownloads={fileDownloads}
        />
      }
      transactionFieldsComponent={
        <TransactionFields {...customTransactionFieldProps('customer')} />
      }
      requestQuote={
        <RequestQuote
          transaction={transaction}
          isNegotiationProcess={isNegotiationProcess}
          isCustomerBanned={isCustomerBanned}
          transactionRole={transactionRole}
          processState={stateData?.processState}
          intl={intl}
          transactionFieldsComponent={
            <TransactionFields {...customTransactionFieldProps('customer', true)} />
          }
        />
      }
      offer={
        <Offer
          transaction={transaction}
          isNegotiationProcess={isNegotiationProcess}
          transactionRole={transactionRole}
          isRegularNegotiation={isRegularNegotiation}
          isProviderBanned={isProviderBanned}
          intl={intl}
          transactionFieldsComponent={
            <TransactionFields {...customTransactionFieldProps('provider', true)} />
          }
        />
      }
      canAttachPhotos={!!listingTypeHasFileAttachments && allowFiles}
      isInquiryProcess={processName === INQUIRY_PROCESS_NAME}
      config={config}
      {...orderBreakdownMaybe}
      orderPanel={
        <OrderPanel
          className={classNames(css.orderPanel, {
            [css.orderPanelNextToTitle]: stateData.showDetailCardHeadings,
          })}
          titleClassName={css.orderTitle}
          listing={listing}
          isOwnListing={isOwnSale}
          lineItemUnitType={lineItemUnitType}
          title={listingTitle}
          titleDesktop={
            <H4 as="h2" className={css.orderPanelTitle}>
              {listingDeleted ? (
                listingTitle
              ) : (
                <NamedLink
                  name="ListingPage"
                  params={{ id: listing.id?.uuid, slug: createSlug(listingTitle) }}
                >
                  {listingTitle}
                </NamedLink>
              )}
            </H4>
          }
          author={listing.author}
          hideAuthorInfo={true}
          hidePrice={isDownloadProcess(processName)}
          onSubmit={isNegotiationProcess ? onMakeOffer : handleSubmitOrderRequest}
          onManageDisableScrolling={onManageDisableScrolling}
          monthlyTimeSlots={monthlyTimeSlots}
          onFetchTimeSlots={onFetchTimeSlots}
          {...restOfProps}
          validListingTypes={config.listing.listingTypes}
          marketplaceCurrency={config.currency}
          dayCountAvailableForBooking={config.stripe.dayCountAvailableForBooking}
          marketplaceName={config.marketplaceName}
        />
      }
    />
  ) : (
    loadingOrFailedFetching
  );
  const marketplaceCurrency = config.currency;
  const currency = transaction?.attributes?.payinTotal?.currency || marketplaceCurrency;
  const currencyConfig = currency ? appSettings.getCurrencyFormatting(currency) : null;
  const counterOffers = [
    process?.transitions?.CUSTOMER_MAKE_COUNTER_OFFER,
    process?.transitions?.PROVIDER_MAKE_COUNTER_OFFER,
  ];
  const negotiationOfferLineItem = transaction?.attributes?.lineItems?.find(item =>
    [LINE_ITEM_REQUEST, LINE_ITEM_OFFER].includes(item.code)
  );
  const currentOffer = negotiationOfferLineItem?.unitPrice;
  const showMakeCounterOfferModal =
    currencyConfig &&
    (process?.transitions?.CUSTOMER_MAKE_COUNTER_OFFER ||
      process?.transitions?.PROVIDER_MAKE_COUNTER_OFFER);

  const pageHeading = isDataAvailable
    ? intl.formatMessage(
        {
          id: `TransactionPage.${processName}.${transactionRole}.${stateData.processState}.title`,
        },
        {
          customerName: customer?.attributes.profile.displayName,
          providerName: provider?.attributes.profile.displayName,
        }
      )
    : null;

  return (
    <Page
      title={intl.formatMessage(
        { id: 'TransactionPage.schemaTitle' },
        { title: listingTitle, h1: pageHeading }
      )}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>{panel}</div>
        <ReviewModal
          id="ReviewOrderModal"
          isOpen={isReviewModalOpen}
          focusElementId={`${actionButtonContainer}_${ACTION_BUTTON_1_ID}`}
          onCloseModal={() => setReviewModalOpen(false)}
          onManageDisableScrolling={onManageDisableScrolling}
          onSubmitReview={onSubmitReview}
          revieweeName={otherUserDisplayName}
          reviewSent={reviewSubmitted}
          sendReviewInProgress={sendReviewInProgress}
          sendReviewError={sendReviewError}
          marketplaceName={config.marketplaceName}
        />
        {process?.transitions?.REPORT ? (
          <ReportModal
            id="ReportOrderModal"
            isOpen={isReportModalOpen}
            focusElementId={`${actionButtonContainer}_reportOrderButton`}
            onCloseModal={() => setReportModalOpen(false)}
            onManageDisableScrolling={onManageDisableScrolling}
            onReportOrder={onReportOrder(
              transaction?.id,
              process.transitions.REPORT,
              onTransition,
              setReportSubmitted
            )}
            reportSubmitted={reportSubmitted}
            reportInProgress={transitionInProgress === process.transitions.REPORT}
            reportError={transitionError}
          />
        ) : null}
        {process?.transitions?.DISPUTE ? (
          <DisputeModal
            id="DisputeOrderModal"
            isOpen={isDisputeModalOpen}
            focusElementId={`${actionButtonContainer}_disputeOrderButton`}
            onCloseModal={() => setDisputeModalOpen(false)}
            onManageDisableScrolling={onManageDisableScrolling}
            onDisputeOrder={onDisputeOrder(
              transaction?.id,
              process.transitions.DISPUTE,
              onTransition,
              setDisputeSubmitted
            )}
            disputeSubmitted={disputeSubmitted}
            disputeInProgress={transitionInProgress === process.transitions.DISPUTE}
            disputeError={transitionError}
          />
        ) : null}
        {process?.transitions?.REQUEST_CHANGES ? (
          <RequestChangesModal
            id="RequestChangesModal"
            isOpen={isRequestChangesModalOpen}
            focusElementId={`${actionButtonContainer}_${ACTION_BUTTON_2_ID}`}
            onCloseModal={() => setRequestChangesModalOpen(false)}
            onManageDisableScrolling={onManageDisableScrolling}
            onChangeRequest={onChangeRequest(
              transaction?.id,
              process.transitions.REQUEST_CHANGES,
              onTransition,
              onSendMessage,
              config,
              setRequestChangesModalOpen,
              setChangeRequestSubmitted
            )}
            changeRequestSubmitted={changeRequestSubmitted}
            changeRequestInProgress={transitionInProgress === process.transitions.REQUEST_CHANGES}
            changeRequestError={transitionError}
          />
        ) : null}
        {showMakeCounterOfferModal ? (
          <MakeCounterOfferModal
            id="MakeCounterOfferModal"
            isOpen={isMakeCounterOfferModalOpen}
            onCloseModal={() => setMakeCounterOfferModalOpen(false)}
            focusElementId={`${actionButtonContainer}_${ACTION_BUTTON_3_ID}`}
            onManageDisableScrolling={onManageDisableScrolling}
            onMakeCounterOffer={onMakeCounterOffer(
              transaction?.id,
              transactionRole === CUSTOMER
                ? process?.transitions?.CUSTOMER_MAKE_COUNTER_OFFER
                : process?.transitions?.PROVIDER_MAKE_COUNTER_OFFER,
              onTransition,
              transactionRole,
              currency,
              setMakeCounterOfferModalOpen,
              setCounterOfferSubmitted
            )}
            currentOffer={currentOffer}
            counterOfferSubmitted={counterOfferSubmitted}
            counterOfferInProgress={counterOffers.includes(transitionInProgress)}
            counterOfferError={transitionError}
            currencyConfig={currencyConfig}
          />
        ) : null}
        {process?.transitions?.REQUEST_EXTRA_DAY ? (
          <RequestExtraDayModal
            id="RequestExtraDayModal"
            isOpen={isRequestExtraDayModalOpen}
            onCloseModal={() => setRequestExtraDayModalOpen(false)}
            focusElementId={`${actionButtonContainer}_${ACTION_BUTTON_3_ID}`}
            onManageDisableScrolling={onManageDisableScrolling}
            onRequestExtraDay={onRequestExtraDay(
              transaction?.id,
              onDispatchRequestExtraDay,
              timeZone,
              setRequestExtraDayModalOpen,
              setRequestExtraDaySubmitted,
              setRequestExtraDayInProgress,
              setRequestExtraDayError,
              setExtraDayPaymentTransaction,
              setExtraDayPaymentModalOpen
            )}
            extraDayDate={booking?.attributes?.end}
            dayCountAvailableForBooking={config.stripe.dayCountAvailableForBooking}
            timeZone={timeZone}
            monthlyTimeSlots={monthlyTimeSlots}
            requestExtraDaySubmitted={requestExtraDaySubmitted}
            requestExtraDayInProgress={requestExtraDayInProgress}
            requestExtraDayError={requestExtraDayError}
          />
        ) : null}
        {process?.transitions?.REQUEST_EXTRA_DAY ? (
          <ExtraDayPaymentModal
            id="ExtraDayPaymentModal"
            isOpen={isExtraDayPaymentModalOpen}
            onCloseModal={() => setExtraDayPaymentModalOpen(false)}
            focusElementId={`${actionButtonContainer}_${ACTION_BUTTON_3_ID}`}
            onManageDisableScrolling={onManageDisableScrolling}
            paymentTransaction={extraDayPaymentTransaction}
            stripePublishableKey={config.stripe.publishableKey}
            currentUserName={userDisplayNameAsString(currentUser, '')}
            extraDayCount={extraDayCount}
            onConfirmCardPayment={onConfirmCardPayment}
            onConfirmExtraDayPayment={onConfirmExtraDayPayment}
            onPaymentSuccess={onExtraDayPaymentSuccess}
          />
        ) : null}
        {process?.transitions?.LINK_DEPOSIT_PAYMENT ? (
          <DepositPaymentModal
            id="DepositPaymentModal"
            isOpen={isDepositPaymentModalOpen}
            onCloseModal={() => setDepositPaymentModalOpen(false)}
            focusElementId={`${actionButtonContainer}_${ACTION_BUTTON_1_ID}`}
            onManageDisableScrolling={onManageDisableScrolling}
            transactionId={transaction?.id}
            stripePublishableKey={config.stripe.publishableKey}
            currentUserName={userDisplayNameAsString(currentUser, '')}
            onInitiateDepositHold={onInitiateDepositHold}
            onConfirmCardPayment={onConfirmCardPayment}
            onConfirmDepositHold={onConfirmDepositHold}
            onPaymentSuccess={onDepositPaymentSuccess}
          />
        ) : null}
      </LayoutSingleColumn>
    </Page>
  );
};

/**
 * The TransactionPage "container" component.
 * Connects TransactionPageComponent to the Redux store and provides dispatch callbacks.
 *
 * @component
 * @param {Object} props from the router (routeConfiguration.js and Routes.js).
 * @returns {JSX.Element}
 */
const TransactionPage = props => {
  const dispatch = useDispatch();
  const history = useHistory();

  // State selectors
  const {
    fetchTransactionError,
    transitionInProgress,
    transitionError,
    transactionRef,
    fetchMessagesInProgress,
    fetchMessagesError,
    totalMessagePages,
    oldestMessagePageFetched,
    messages,
    savePaymentMethodFailed,
    sendMessageInProgress,
    sendMessageError,
    sendReviewInProgress,
    sendReviewError,
    monthlyTimeSlots,
    timeSlotsForDate,
    processTransitions,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    fileUploadsDisabled,
    fileDownloads,
  } = useSelector(state => state.TransactionPage, shallowEqual);

  const currentUser = useSelector(state => state.user?.currentUser);
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const transaction = useSelector(state => {
    const [tx] = getMarketplaceEntities(state, transactionRef ? [transactionRef] : []);
    return tx || null;
  });

  const fileUploads = useSelector(selectFileUploads, shallowEqual);

  // Dispatch callbacks
  const onTransition = useCallback(
    (txId, transitionName, params) => dispatch(makeTransition(txId, transitionName, params)),
    [dispatch]
  );
  const onShowMoreMessages = useCallback(
    (txId, config) => dispatch(fetchMoreMessages(txId, config)),
    [dispatch]
  );
  const onSendMessage = useCallback(
    (txId, message, config, fileIds) => dispatch(sendMessage(txId, message, config, fileIds)),
    [dispatch]
  );
  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) =>
      dispatch(manageDisableScrolling(componentId, disableScrolling)),
    [dispatch]
  );
  const onSendReview = useCallback(
    (tx, transitionOptions, params, config) =>
      dispatch(sendReview(tx, transitionOptions, params, config)),
    [dispatch]
  );
  const callSetInitialValues = useCallback(
    (setInitialValues, values) => dispatch(setInitialValues(values)),
    [dispatch]
  );
  const onInitializeCardPaymentData = useCallback(() => dispatch(initializeCardPaymentData()), [
    dispatch,
  ]);
  const onFetchTransactionLineItems = useCallback(
    (orderData, listingId, isOwnListing) =>
      dispatch(fetchTransactionLineItems(orderData, listingId, isOwnListing)),
    [dispatch]
  );
  const onFetchTimeSlots = useCallback(
    (listingId, start, end, timeZone, options) =>
      dispatch(fetchTimeSlots(listingId, start, end, timeZone, options)),
    [dispatch]
  );
  const onUploadFile = useCallback((file, tempId) => dispatch(uploadFile(file, tempId)), [
    dispatch,
  ]);
  const onClearUploadedFiles = useCallback(tempIds => dispatch(clearUploadedFiles(tempIds)), [
    dispatch,
  ]);
  const onDownloadFile = useCallback(
    (fileAttachmentId, isOwnFile) => dispatch(downloadFile(fileAttachmentId, isOwnFile)),
    [dispatch]
  );
  const onRequestExtraDay = useCallback(
    (transactionId, startDate, endDate, note) =>
      dispatch(requestExtraDay(transactionId, startDate, endDate, note)),
    [dispatch]
  );
  const onAcceptExtraDay = useCallback(
    extraDayTransactionId => dispatch(acceptExtraDay(extraDayTransactionId)),
    [dispatch]
  );
  const onDeclineExtraDay = useCallback(
    extraDayTransactionId => dispatch(declineExtraDay(extraDayTransactionId)),
    [dispatch]
  );
  const onConfirmCardPayment = useCallback(params => dispatch(confirmCardPayment(params)), [
    dispatch,
  ]);
  const onConfirmExtraDayPayment = useCallback(
    extraDayTransactionId => dispatch(confirmExtraDayPayment(extraDayTransactionId)),
    [dispatch]
  );
  const onFetchExtraDayTransaction = useCallback(
    extraDayTransactionId => dispatch(fetchExtraDayTransaction(extraDayTransactionId)),
    [dispatch]
  );
  const onInitiateDepositHold = useCallback(
    transactionId => dispatch(initiateDepositHold(transactionId)),
    [dispatch]
  );
  const onConfirmDepositHold = useCallback(
    depositTransactionId => dispatch(confirmDepositHold(depositTransactionId)),
    [dispatch]
  );
  const onReleaseDeposit = useCallback(transactionId => dispatch(releaseDeposit(transactionId)), [
    dispatch,
  ]);
  const onClaimDeposit = useCallback(transactionId => dispatch(claimDeposit(transactionId)), [
    dispatch,
  ]);

  return (
    <TransactionPageComponent
      {...props}
      currentUser={currentUser}
      fetchTransactionError={fetchTransactionError}
      transitionInProgress={transitionInProgress}
      transitionError={transitionError}
      scrollingDisabled={scrollingDisabled}
      transaction={transaction}
      fetchMessagesInProgress={fetchMessagesInProgress}
      fetchMessagesError={fetchMessagesError}
      totalMessagePages={totalMessagePages}
      oldestMessagePageFetched={oldestMessagePageFetched}
      messages={messages}
      savePaymentMethodFailed={savePaymentMethodFailed}
      sendMessageInProgress={sendMessageInProgress}
      sendMessageError={sendMessageError}
      sendReviewInProgress={sendReviewInProgress}
      sendReviewError={sendReviewError}
      nextTransitions={processTransitions}
      monthlyTimeSlots={monthlyTimeSlots}
      timeSlotsForDate={timeSlotsForDate}
      lineItems={lineItems}
      fetchLineItemsInProgress={fetchLineItemsInProgress}
      fetchLineItemsError={fetchLineItemsError}
      fileUploads={fileUploads}
      fileUploadsDisabled={fileUploadsDisabled}
      onTransition={onTransition}
      onShowMoreMessages={onShowMoreMessages}
      onSendMessage={onSendMessage}
      onManageDisableScrolling={onManageDisableScrolling}
      onSendReview={onSendReview}
      callSetInitialValues={callSetInitialValues}
      onInitializeCardPaymentData={onInitializeCardPaymentData}
      onFetchTransactionLineItems={onFetchTransactionLineItems}
      onFetchTimeSlots={onFetchTimeSlots}
      onUploadFile={onUploadFile}
      onClearUploadedFiles={onClearUploadedFiles}
      onDownloadFile={onDownloadFile}
      fileDownloads={fileDownloads}
      onRequestExtraDay={onRequestExtraDay}
      onAcceptExtraDay={onAcceptExtraDay}
      onDeclineExtraDay={onDeclineExtraDay}
      onConfirmCardPayment={onConfirmCardPayment}
      onConfirmExtraDayPayment={onConfirmExtraDayPayment}
      onFetchExtraDayTransaction={onFetchExtraDayTransaction}
      onInitiateDepositHold={onInitiateDepositHold}
      onConfirmDepositHold={onConfirmDepositHold}
      onReleaseDeposit={onReleaseDeposit}
      onClaimDeposit={onClaimDeposit}
      history={history}
    />
  );
};

export default TransactionPage;
