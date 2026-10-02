const { getSdk, getTrustedSdk, handleError, serialize } = require('../../api-util/sdk');

// Only "real" booking processes count towards a referred user's first
// booking - extra-day-payment transactions are sub-transactions of an
// existing booking, not a standalone first booking.
const BOOKING_PROCESS_NAMES = ['default-booking', 'default-negotiation'];

/**
 * If the current user signed up via a referral link and this is their first
 * completed (paid) booking, marks their own privateData with
 * referralConverted/referralConvertedAt. This is a self-write only - no
 * payout happens automatically. The operator pays the referrer manually
 * (bank transfer) based on the admin report - see
 * server/api/referral/admin-report.js.
 */
module.exports = (req, res) => {
  const sdk = getSdk(req, res);

  sdk.currentUser
    .show()
    .then(showCurrentUserResponse => {
      const currentUser = showCurrentUserResponse.data.data;
      const privateData = currentUser.attributes.profile.privateData || {};
      const { referredByUserId, referralConverted } = privateData;

      if (!referredByUserId || referralConverted) {
        return { marked: false };
      }

      return sdk.transactions
        .query({
          only: 'order',
          processNames: BOOKING_PROCESS_NAMES,
          'fields.transaction': ['payinTotal'],
        })
        .then(txResponse => {
          const paidBookings = txResponse.data.data.filter(tx => !!tx.attributes.payinTotal);
          const isFirstBooking = paidBookings.length === 1;

          if (!isFirstBooking) {
            return { marked: false };
          }

          return getTrustedSdk(req)
            .then(trustedSdk =>
              trustedSdk.currentUser.updateProfile(
                {
                  privateData: {
                    referralConverted: true,
                    referralConvertedAt: new Date().toISOString(),
                  },
                },
                { expand: true }
              )
            )
            .then(() => ({ marked: true }));
        });
    })
    .then(result => {
      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize(result))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
