import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

/**
 * Get state data against booking process for TransactionPage's UI.
 * I.e. info about showing action buttons, current state etc.
 *
 * @param {*} txInfo detials about transaction
 * @param {*} processInfo  details about process
 */
export const getStateDataForBookingProcess = (txInfo, processInfo) => {
  const {
    transaction,
    transactionRole,
    nextTransitions,
    onOpenRequestExtraDayModal,
    onOpenExtraDayPaymentModal,
    onAcceptExtraDay,
    onDeclineExtraDay,
    onOpenDepositPaymentModal,
    onReleaseDeposit,
    onClaimDeposit,
  } = txInfo;
  const isProviderBanned = transaction?.provider?.attributes?.banned;
  const isCustomerBanned = transaction?.provider?.attributes?.banned;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;
  const extraDay = transaction?.attributes?.protectedData?.extraDay;
  const deposit = transaction?.attributes?.protectedData?.deposit;
  const depositInSubunits = transaction?.listing?.attributes?.publicData?.depositInSubunits;
  const needsDepositPayment = !!depositInSubunits && !deposit;
  const canReleaseOrClaimDeposit = deposit?.status === 'held';

  const {
    processName,
    processState,
    states,
    transitions,
    isCustomer,
    actionButtonProps,
    leaveReviewProps,
  } = processInfo;

  const stateData = new ConditionalResolver([processState, transactionRole])
    .cond([states.INQUIRY, CUSTOMER], () => {
      const transitionNames = Array.isArray(nextTransitions)
        ? nextTransitions.map(t => t.attributes.name)
        : [];
      const requestAfterInquiry = transitions.REQUEST_PAYMENT_AFTER_INQUIRY;
      const hasCorrectNextTransition = transitionNames.includes(requestAfterInquiry);
      const showOrderPanel = !isProviderBanned && hasCorrectNextTransition;
      return { processName, processState, showOrderPanel, showDetailCardHeadings: true };
    })
    .cond([states.INQUIRY, PROVIDER], () => {
      return { processName, processState, showDetailCardHeadings: true };
    })
    .cond([states.PREAUTHORIZED, CUSTOMER], () => {
      return { processName, processState, showDetailCardHeadings: true, showExtraInfo: true };
    })
    .cond([states.PREAUTHORIZED, PROVIDER], () => {
      const primary = isCustomerBanned ? null : actionButtonProps(transitions.ACCEPT, PROVIDER);
      const secondary = isCustomerBanned ? null : actionButtonProps(transitions.DECLINE, PROVIDER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        primaryButtonProps: primary,
        secondaryButtonProps: secondary,
      };
    })
    .cond([states.ACCEPTED, CUSTOMER], () => {
      // extraDay.status lifecycle: undefined -> 'payment_initiated' (sub-tx
      // created, card not yet entered/confirmed) -> 'requested' (card
      // confirmed, awaiting provider) -> 'accepted' (done, charge captured)
      // or 'declined'/'expired' (customer can request again).
      const canRequestExtraDay =
        !extraDay || extraDay.status === 'declined' || extraDay.status === 'expired';
      const needsToResumePayment = extraDay?.status === 'payment_initiated';

      const tertiaryButtonPropsMaybe = canRequestExtraDay
        ? {
            tertiaryButtonProps: actionButtonProps(transitions.REQUEST_EXTRA_DAY, CUSTOMER, {
              onAction: onOpenRequestExtraDayModal,
            }),
          }
        : needsToResumePayment
        ? {
            tertiaryButtonProps: actionButtonProps(transitions.LINK_EXTRA_DAY_PAYMENT, CUSTOMER, {
              onAction: onOpenExtraDayPaymentModal,
              actionButtonTranslationId: 'TransactionPage.default-booking.customer.extraDay.payButton',
              actionButtonTranslationErrorId:
                'TransactionPage.default-booking.customer.extraDay.payButtonError',
            }),
          }
        : {};

      const depositButtonPropsMaybe = needsDepositPayment
        ? {
            primaryButtonProps: actionButtonProps(transitions.LINK_DEPOSIT_PAYMENT, CUSTOMER, {
              onAction: onOpenDepositPaymentModal,
              actionButtonTranslationId: 'TransactionPage.default-booking.customer.deposit.payButton',
              actionButtonTranslationErrorId:
                'TransactionPage.default-booking.customer.deposit.payButtonError',
            }),
          }
        : {};

      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: canRequestExtraDay || needsToResumePayment || needsDepositPayment,
        ...depositButtonPropsMaybe,
        ...tertiaryButtonPropsMaybe,
      };
    })
    .cond([states.ACCEPTED, PROVIDER], () => {
      // Pricing is automatic (see server/api/extra-day/request.js). The
      // customer's card is already authorized by the time the request
      // shows up here ('requested' = confirm-payment succeeded on the
      // linked extra-day transaction) - accepting captures the charge,
      // declining releases the hold.
      const canReviewExtraDay = extraDay?.status === 'requested';

      const reviewButtonPropsMaybe = canReviewExtraDay
        ? {
            primaryButtonProps: actionButtonProps(transitions.ACCEPT_EXTRA_DAY, PROVIDER, {
              onAction: onAcceptExtraDay,
              actionButtonTranslationId: 'TransactionPage.default-booking.provider.extraDay.acceptButton',
              actionButtonTranslationErrorId:
                'TransactionPage.default-booking.provider.extraDay.acceptButtonError',
            }),
            secondaryButtonProps: actionButtonProps(transitions.DECLINE_EXTRA_DAY, PROVIDER, {
              onAction: onDeclineExtraDay,
              actionButtonTranslationId: 'TransactionPage.default-booking.provider.extraDay.declineButton',
              actionButtonTranslationErrorId:
                'TransactionPage.default-booking.provider.extraDay.declineButtonError',
            }),
          }
        : canReleaseOrClaimDeposit
        ? {
            primaryButtonProps: actionButtonProps(transitions.RECORD_DEPOSIT_RELEASE, PROVIDER, {
              onAction: onReleaseDeposit,
              actionButtonTranslationId: 'TransactionPage.default-booking.provider.deposit.releaseButton',
              actionButtonTranslationErrorId:
                'TransactionPage.default-booking.provider.deposit.releaseButtonError',
            }),
            secondaryButtonProps: actionButtonProps(transitions.RECORD_DEPOSIT_CLAIM, PROVIDER, {
              onAction: onClaimDeposit,
              actionButtonTranslationId: 'TransactionPage.default-booking.provider.deposit.claimButton',
              actionButtonTranslationErrorId:
                'TransactionPage.default-booking.provider.deposit.claimButtonError',
            }),
          }
        : {};

      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: canReviewExtraDay || canReleaseOrClaimDeposit,
        ...reviewButtonPropsMaybe,
      };
    })
    .cond([states.DELIVERED, PROVIDER], () => {
      const depositButtonPropsMaybe = canReleaseOrClaimDeposit
        ? {
            secondaryButtonProps: actionButtonProps(
              transitions.RECORD_DEPOSIT_RELEASE_DELIVERED,
              PROVIDER,
              {
                onAction: onReleaseDeposit,
                actionButtonTranslationId:
                  'TransactionPage.default-booking.provider.deposit.releaseButton',
                actionButtonTranslationErrorId:
                  'TransactionPage.default-booking.provider.deposit.releaseButtonError',
              }
            ),
            tertiaryButtonProps: actionButtonProps(
              transitions.RECORD_DEPOSIT_CLAIM_DELIVERED,
              PROVIDER,
              {
                onAction: onClaimDeposit,
                actionButtonTranslationId: 'TransactionPage.default-booking.provider.deposit.claimButton',
                actionButtonTranslationErrorId:
                  'TransactionPage.default-booking.provider.deposit.claimButtonError',
              }
            ),
          }
        : {};

      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsFirstLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
        ...depositButtonPropsMaybe,
      };
    })
    .cond([states.DELIVERED, _], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsFirstLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_PROVIDER, CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED, PROVIDER], () => {
      const depositButtonPropsMaybe = canReleaseOrClaimDeposit
        ? {
            showActionButtons: true,
            primaryButtonProps: actionButtonProps(
              transitions.RECORD_DEPOSIT_RELEASE_REVIEWED,
              PROVIDER,
              {
                onAction: onReleaseDeposit,
                actionButtonTranslationId:
                  'TransactionPage.default-booking.provider.deposit.releaseButton',
                actionButtonTranslationErrorId:
                  'TransactionPage.default-booking.provider.deposit.releaseButtonError',
              }
            ),
            secondaryButtonProps: actionButtonProps(
              transitions.RECORD_DEPOSIT_CLAIM_REVIEWED,
              PROVIDER,
              {
                onAction: onClaimDeposit,
                actionButtonTranslationId: 'TransactionPage.default-booking.provider.deposit.claimButton',
                actionButtonTranslationErrorId:
                  'TransactionPage.default-booking.provider.deposit.claimButtonError',
              }
            ),
          }
        : {};
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviews: true,
        ...depositButtonPropsMaybe,
      };
    })
    .cond([states.REVIEWED, _], () => {
      return { processName, processState, showDetailCardHeadings: true, showReviews: true };
    })
    .default(() => {
      // Default values for other states
      return { processName, processState, showDetailCardHeadings: true };
    })
    .resolve();

  // These overwrite the default ActivityFeed messages (which are tied to
  // the resulting *state*, not the transition itself) for the extra-day
  // transitions - all three self-loop back into ACCEPTED, so without this
  // they'd all show the generic "accepted" bullet. Kept static (no
  // date/price interpolation) since the price can be edited later - a
  // bullet reading live protectedData would misreport older transitions.
  const transitionMessages = [
    {
      transition: transitions.REQUEST_EXTRA_DAY,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.request-extra-day',
    },
    {
      transition: transitions.PROVIDER_SET_EXTRA_DAY_PRICE,
      translationId:
        'TransactionPage.ActivityFeed.default-booking.transition.provider-set-extra-day-price',
    },
    {
      transition: transitions.ACCEPT_EXTRA_DAY,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.accept-extra-day',
    },
    {
      transition: transitions.DECLINE_EXTRA_DAY,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.decline-extra-day',
    },
    {
      transition: transitions.CONFIRM_EXTRA_DAY_PAID,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.request-extra-day',
    },
    {
      transition: transitions.CONFIRM_DEPOSIT_HELD,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-held',
    },
    {
      transition: transitions.CONFIRM_DEPOSIT_HELD_DELIVERED,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-held',
    },
    {
      transition: transitions.RECORD_DEPOSIT_RELEASE,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-released',
    },
    {
      transition: transitions.RECORD_DEPOSIT_RELEASE_DELIVERED,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-released',
    },
    {
      transition: transitions.RECORD_DEPOSIT_RELEASE_REVIEWED,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-released',
    },
    {
      transition: transitions.RECORD_DEPOSIT_CLAIM,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-claimed',
    },
    {
      transition: transitions.RECORD_DEPOSIT_CLAIM_DELIVERED,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-claimed',
    },
    {
      transition: transitions.RECORD_DEPOSIT_CLAIM_REVIEWED,
      translationId: 'TransactionPage.ActivityFeed.default-booking.transition.deposit-claimed',
    },
  ];

  return { ...stateData, transitionMessages };
};
