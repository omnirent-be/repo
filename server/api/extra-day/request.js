const moment = require('moment-timezone');
const { extraDayPaymentLineItems } = require('../../api-util/extraDayLineItems');
const { getSdk, getTrustedSdk, handleError, serialize, fetchCommission } = require('../../api-util/sdk');
const { daysBetween } = require('../../api-util/dates');

const transactionPromise = (sdk, id) =>
  sdk.transactions.show({ id, include: ['customer', 'booking', 'listing'] });

// Booking start/end are UTC instants that fall on the listing's own
// timezone's day boundaries (e.g. 22:00:00.000Z for Europe/Brussels in
// October) - not literal UTC midnight. Both helpers below account for that.
const toISODateInTimeZone = (date, timeZone) => moment(date).tz(timeZone).format('YYYY-MM-DD');
const parseISODateAsMidnightInTimeZone = (dateString, timeZone) =>
  moment.tz(dateString, timeZone).toDate();

const eligibleStatuses = [undefined, 'declined', 'expired'];

module.exports = (req, res) => {
  const { transactionId, startDate, endDate, note } = req.body || {};
  const sdk = getSdk(req, res);

  Promise.all([transactionPromise(sdk, transactionId), sdk.currentUser.show(), fetchCommission(sdk)])
    .then(([showTransactionResponse, showCurrentUserResponse, fetchAssetsResponse]) => {
      const transaction = showTransactionResponse.data.data;
      const included = showTransactionResponse.data.included || [];
      const booking = included.find(i => i.type === 'booking');
      const listing = included.find(i => i.type === 'listing');
      const timeZone = listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC';
      const currentUserId = showCurrentUserResponse.data.data.id.uuid;
      const customerId = transaction.relationships?.customer?.data?.id?.uuid;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      if (!customerId || customerId !== currentUserId) {
        const error = new Error('Only the customer can request an extra day.');
        error.status = 403;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const isEligibleState = transaction.attributes.lastTransition !== 'transition/cancel';
      const existingExtraDay = transaction.attributes.protectedData?.extraDay;
      const canRequest = eligibleStatuses.includes(existingExtraDay?.status);
      if (!isEligibleState || !canRequest) {
        const error = new Error(
          'This booking already has an extra-day request in progress or paid.'
        );
        error.status = 409;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const expectedStartDate = toISODateInTimeZone(booking.attributes.end, timeZone);
      const isValidRange = startDate === expectedStartDate && endDate > startDate;
      if (!isValidRange) {
        const error = new Error(
          'The requested date range is not contiguous with the current booking.'
        );
        error.status = 409;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      // This is a genuinely separate booking (its own reservation, its own
      // payment) rather than an extension of the original one - Sharetribe's
      // update-booking action re-validates a transaction's ENTIRE booking
      // range on every call, including the part it already owns, so it
      // can't be used to grow an already-accepted booking without
      // conflicting with itself.
      const bookingStart = parseISODateAsMidnightInTimeZone(startDate, timeZone);
      const bookingEnd = parseISODateAsMidnightInTimeZone(endDate, timeZone);
      const dayCount = daysBetween(bookingStart, bookingEnd);

      const listingPrice = listing.attributes.price;
      const extraDayUnitAmount =
        listing.attributes.publicData?.extraDayPriceInSubunits ?? listingPrice.amount;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};
      const lineItems = extraDayPaymentLineItems(
        extraDayUnitAmount,
        dayCount,
        listingPrice.currency,
        providerCommission,
        customerCommission
      );

      return getTrustedSdk(req).then(trustedSdk =>
        trustedSdk.transactions
          .initiate(
            {
              processAlias: 'extra-day-payment/release-1',
              transition: 'transition/request-extra-day',
              params: {
                listingId: listing.id,
                bookingStart,
                bookingEnd,
                protectedData: {
                  linkedBookingTransactionId: transactionId,
                },
                lineItems,
              },
            },
            { expand: true }
          )
          .then(initiateResponse => {
            const extraDayTransactionId = initiateResponse.data.data.id.uuid;
            return trustedSdk.transactions
              .transition(
                {
                  id: transactionId,
                  transition: 'transition/link-extra-day-payment',
                  params: {
                    protectedData: {
                      extraDay: {
                        status: 'payment_initiated',
                        startDate,
                        endDate,
                        note: note || null,
                        extraDayTransactionId,
                        requestedAt: new Date().toISOString(),
                        requestedBy: currentUserId,
                      },
                    },
                  },
                },
                { expand: false }
              )
              .then(() => initiateResponse);
          })
      );
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ status, statusText, data }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
