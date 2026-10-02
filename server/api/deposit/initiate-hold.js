const { depositLineItems } = require('../../api-util/depositLineItems');
const { getSdk, getTrustedSdk, handleError, serialize } = require('../../api-util/sdk');

const transactionPromise = (sdk, id) =>
  sdk.transactions.show({ id, include: ['listing', 'customer'] });
const getListingRelationShip = transactionShowAPIData => {
  const { data, included } = transactionShowAPIData;
  const { relationships } = data;
  const { listing: listingRef } = relationships;
  return included.find(i => i.id.uuid === listingRef.data.id.uuid);
};

module.exports = (req, res) => {
  const { transactionId } = req.body || {};
  const sdk = getSdk(req, res);

  Promise.all([transactionPromise(sdk, transactionId), sdk.currentUser.show()])
    .then(([showTransactionResponse, showCurrentUserResponse]) => {
      const transaction = showTransactionResponse.data.data;
      const listing = getListingRelationShip(showTransactionResponse.data);
      const currentUserId = showCurrentUserResponse.data.data.id.uuid;
      const customerId = transaction.relationships?.customer?.data?.id?.uuid;

      if (!customerId || customerId !== currentUserId) {
        const error = new Error('Only the customer can pay the security deposit.');
        error.status = 403;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const depositInSubunits = listing?.attributes?.publicData?.depositInSubunits;
      if (!depositInSubunits) {
        const error = new Error('This listing has no security deposit configured.');
        error.status = 409;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const deposit = transaction.attributes.protectedData?.deposit;
      if (deposit && deposit.status !== 'payment_failed') {
        const error = new Error('The security deposit has already been requested or paid.');
        error.status = 409;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const currency = listing.attributes.price.currency;
      const lineItems = depositLineItems(depositInSubunits, currency);

      return getTrustedSdk(req).then(trustedSdk =>
        trustedSdk.transactions
          .initiate(
            {
              processAlias: 'deposit-hold/release-1',
              transition: 'transition/request-deposit-hold',
              params: {
                listingId: listing.id,
                protectedData: {
                  linkedBookingTransactionId: transactionId,
                },
                lineItems,
              },
            },
            { expand: true }
          )
          .then(initiateResponse => {
            const depositTransactionId = initiateResponse.data.data.id.uuid;
            return trustedSdk.transactions
              .transition(
                {
                  id: transactionId,
                  transition: 'transition/link-deposit-payment',
                  params: {
                    protectedData: {
                      deposit: {
                        status: 'payment_initiated',
                        amountInSubunits: depositInSubunits,
                        currency,
                        depositTransactionId,
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
