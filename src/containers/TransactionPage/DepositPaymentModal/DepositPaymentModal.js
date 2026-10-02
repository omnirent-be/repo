import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { STRIPE_JS_LOADED_EVENT } from '../../../util/includeScripts';

import { Modal, Button, IconSpinner } from '../../../components';

import IconPriceTag from '../ExtraDayPaymentModal/IconPriceTag';
import css from './DepositPaymentModal.module.css';

const stripeElementsOptions = {
  fonts: [{ cssSrc: 'https://fonts.googleapis.com/css?family=Inter' }],
};
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const cardStyles = {
  base: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", Helvetica, Arial, sans-serif',
    fontSize: isMobile ? '14px' : '16px',
    fontSmoothing: 'antialiased',
    lineHeight: '24px',
    letterSpacing: '-0.1px',
    color: '#4A4A4A',
    '::placeholder': { color: '#B2B2B2' },
  },
};

const getClientSecret = paymentTransaction => {
  const stripePaymentIntents = paymentTransaction?.attributes?.protectedData?.stripePaymentIntents;
  return stripePaymentIntents?.default?.stripePaymentIntentClientSecret || null;
};

/**
 * Modal for a customer to pay the listing's security deposit on an
 * accepted booking. Drives a separate, linked "deposit-hold" transaction
 * end to end: initiate -> Stripe card element -> confirm card payment ->
 * confirm the transaction on the Marketplace API side (captured, held -
 * not paid out until the provider later releases or claims it).
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {string} props.id
 * @param {boolean} props.isOpen
 * @param {Function} props.onCloseModal
 * @param {Function} props.onManageDisableScrolling
 * @param {string} props.transactionId - the original booking's transaction id (uuid string)
 * @param {string} props.stripePublishableKey
 * @param {string} [props.currentUserName]
 * @param {Function} props.onInitiateDepositHold - (transactionId) => Promise<paymentTransaction>
 * @param {Function} props.onConfirmCardPayment - stripe.duck.js confirmCardPayment
 * @param {Function} props.onConfirmDepositHold - (depositTransactionId) => Promise<transaction>
 * @param {Function} props.onPaymentSuccess - called once the payment has fully completed
 * @returns {JSX.Element}
 */
const DepositPaymentModal = props => {
  const intl = useIntl();
  const {
    className,
    rootClassName,
    id,
    isOpen = false,
    onCloseModal,
    focusElementId,
    onManageDisableScrolling,
    transactionId,
    stripePublishableKey,
    currentUserName,
    onInitiateDepositHold,
    onConfirmCardPayment,
    onConfirmDepositHold,
    onPaymentSuccess,
  } = props;
  const classes = classNames(rootClassName || css.root, className);

  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [initiateError, setInitiateError] = useState(null);
  const [initiateInProgress, setInitiateInProgress] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [payError, setPayError] = useState(null);
  const [payInProgress, setPayInProgress] = useState(false);

  const stripeRef = useRef(null);
  const cardRef = useRef(null);
  const cardContainerRef = useRef(null);

  // Step 1: initiate the linked deposit-hold transaction once the modal opens.
  useEffect(() => {
    if (!isOpen || paymentTransaction || initiateInProgress) {
      return;
    }
    setInitiateInProgress(true);
    setInitiateError(null);
    onInitiateDepositHold(transactionId)
      .then(tx => {
        setPaymentTransaction(tx);
        setInitiateInProgress(false);
      })
      .catch(e => {
        setInitiateError(e);
        setInitiateInProgress(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transactionId]);

  // Step 2: once we have a client secret, mount the Stripe card element.
  useEffect(() => {
    const clientSecret = getClientSecret(paymentTransaction);
    if (!isOpen || !clientSecret || !stripePublishableKey || cardRef.current) {
      return undefined;
    }

    const setupStripe = () => {
      if (!window.Stripe || cardRef.current) {
        return;
      }
      stripeRef.current = window.Stripe(stripePublishableKey);
      const elements = stripeRef.current.elements(stripeElementsOptions);
      const card = elements.create('card', { style: cardStyles });
      card.mount(cardContainerRef.current);
      card.addEventListener('change', event => {
        setCardError(event.error ? event.error.message : null);
      });
      cardRef.current = card;
    };

    setupStripe();
    window.addEventListener(STRIPE_JS_LOADED_EVENT, setupStripe);
    return () => {
      window.removeEventListener(STRIPE_JS_LOADED_EVENT, setupStripe);
    };
  }, [isOpen, paymentTransaction, stripePublishableKey]);

  // Cleanup the mounted card element when the modal closes or unmounts.
  useEffect(() => {
    if (isOpen) {
      return undefined;
    }
    return () => {
      if (cardRef.current) {
        cardRef.current.unmount();
        cardRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSubmit = e => {
    e.preventDefault();
    const clientSecret = getClientSecret(paymentTransaction);
    if (!clientSecret || !cardRef.current || !stripeRef.current) {
      return;
    }

    setPayInProgress(true);
    setPayError(null);

    onConfirmCardPayment({
      stripe: stripeRef.current,
      paymentParams: {
        payment_method: {
          billing_details: { name: currentUserName },
          card: cardRef.current,
        },
      },
      stripePaymentIntentClientSecret: clientSecret,
      orderId: paymentTransaction.id,
    })
      .then(() => onConfirmDepositHold(paymentTransaction.id))
      .then(() => {
        setPayInProgress(false);
        onPaymentSuccess(paymentTransaction.id.uuid);
      })
      .catch(e => {
        setPayInProgress(false);
        setPayError(e);
      });
  };

  const priceDisplay = paymentTransaction?.attributes?.payinTotal
    ? formatMoney(intl, paymentTransaction.attributes.payinTotal)
    : null;

  const canPay = !!getClientSecret(paymentTransaction) && !payInProgress;

  return (
    <Modal
      id={id}
      containerClassName={classes}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
    >
      <IconPriceTag className={css.modalIcon} />
      <p className={css.modalTitle}>
        <FormattedMessage id="DepositPaymentModal.title" />
      </p>
      <p className={css.modalMessage}>
        {priceDisplay ? (
          <FormattedMessage id="DepositPaymentModal.description" values={{ price: priceDisplay }} />
        ) : (
          <FormattedMessage id="DepositPaymentModal.loadingDescription" />
        )}
      </p>
      {initiateError ? (
        <p className={css.errorPlaceholder}>
          <FormattedMessage id="DepositPaymentModal.initiateFailed" />
        </p>
      ) : null}
      {initiateInProgress || !paymentTransaction ? (
        <IconSpinner className={css.spinner} />
      ) : (
        <form className={css.formRoot} onSubmit={handleSubmit}>
          <label className={css.paymentLabel} htmlFor={`${id}-card`}>
            <FormattedMessage id="DepositPaymentModal.cardDetailsLabel" />
          </label>
          <div
            className={classNames(css.card, { [css.cardError]: cardError })}
            id={`${id}-card`}
            ref={cardContainerRef}
          />
          {cardError ? <span className={css.error}>{cardError}</span> : null}
          {payError ? (
            <p className={css.errorPlaceholder}>
              <FormattedMessage id="DepositPaymentModal.paymentFailed" />
            </p>
          ) : null}
          <Button
            className={css.submitButton}
            type="submit"
            inProgress={payInProgress}
            disabled={!canPay}
          >
            {priceDisplay
              ? intl.formatMessage({ id: 'DepositPaymentModal.payButton' }, { price: priceDisplay })
              : intl.formatMessage({ id: 'DepositPaymentModal.payButton' }, { price: '' })}
          </Button>
        </form>
      )}
    </Modal>
  );
};

export default DepositPaymentModal;
