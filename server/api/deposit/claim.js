const { getSdk, getTrustedSdk, handleError, serialize } = require('../../api-util/sdk');

const transactionPromise = (sdk, id) => sdk.transactions.show({ id, include: ['provider'] });

// Which self-loop transition records the outcome on the main transaction
// depends on which state it's currently in - see process.edn and
// transactionProcessBooking.js for why this is duplicated per state.
const DELIVERED_TRANSITIONS = [
  'transition/complete',
  'transition/operator-complete',
  // default-negotiation's own entry-to-delivered transitions (booking and
  // negotiation reach state/delivered via different transition names).
  'transition/deliver',
  'transition/operator-mark-delivered',
  'transition/deliver-changes',
  'transition/operator-mark-changes-delivered',
  'transition/link-deposit-payment-delivered',
  'transition/confirm-deposit-held-delivered',
  'transition/record-deposit-release-delivered',
  'transition/record-deposit-claim-delivered',
];
const REVIEWED_TRANSITIONS = [
  'transition/review-2-by-provider',
  'transition/review-2-by-customer',
  'transition/expire-review-period',
  'transition/expire-provider-review-period',
  'transition/expire-customer-review-period',
  'transition/record-deposit-release-reviewed',
  'transition/record-deposit-claim-reviewed',
];

const recordTransitionFor = (lastTransition, accepted, delivered, reviewed) => {
  if (REVIEWED_TRANSITIONS.includes(lastTransition)) return reviewed;
  if (DELIVERED_TRANSITIONS.includes(lastTransition)) return delivered;
  return accepted;
};

module.exports = (req, res) => {
  const { transactionId, reason } = req.body || {};
  const sdk = getSdk(req, res);

  Promise.all([transactionPromise(sdk, transactionId), sdk.currentUser.show()])
    .then(([showTransactionResponse, showCurrentUserResponse]) => {
      const transaction = showTransactionResponse.data.data;
      const currentUserId = showCurrentUserResponse.data.data.id.uuid;
      const providerId = transaction.relationships?.provider?.data?.id?.uuid;

      if (!providerId || providerId !== currentUserId) {
        const error = new Error('Only the provider can claim the security deposit.');
        error.status = 403;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      const deposit = transaction.attributes.protectedData?.deposit;
      if (!deposit || deposit.status !== 'held') {
        const error = new Error('There is no held security deposit to claim.');
        error.status = 409;
        error.statusText = error.message;
        error.data = {};
        throw error;
      }

      return getTrustedSdk(req).then(trustedSdk =>
        trustedSdk.transactions
          .transition(
            {
              id: deposit.depositTransactionId,
              transition: 'transition/claim-deposit',
              params: {},
            },
            { expand: true }
          )
          .then(claimResponse => {
            const recordTransition = recordTransitionFor(
              transaction.attributes.lastTransition,
              'transition/record-deposit-claim',
              'transition/record-deposit-claim-delivered',
              'transition/record-deposit-claim-reviewed'
            );
            return trustedSdk.transactions
              .transition(
                {
                  id: transactionId,
                  transition: recordTransition,
                  params: {
                    protectedData: {
                      deposit: {
                        ...deposit,
                        status: 'claimed',
                        claimedAt: new Date().toISOString(),
                        claimReason: reason || null,
                      },
                    },
                  },
                },
                { expand: false }
              )
              .then(() => claimResponse);
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
