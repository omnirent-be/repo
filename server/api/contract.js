const { getSdk, handleError } = require('../api-util/sdk');
const { buildContractPdf } = require('../api-util/contractPdf');
const { findSignatures } = require('../api-util/contractSignature');

const ACCEPT_TRANSITIONS = ['transition/accept', 'transition/operator-accept'];
const MESSAGES_PER_PAGE = 100;

// Safety net for the profile links printed in the contract (see
// buildContractPdf's profileUrl) - REACT_APP_MARKETPLACE_ROOT_URL is meant
// to hold the live domain in production and only resolves to localhost
// here because that's genuinely correct for local dev (set in .env). If a
// deploy ever forgets to set it, better a real (if hardcoded) production
// link than a broken http://localhost one baked into someone's contract.
const PRODUCTION_ROOT_URL = 'https://omnirent.be';
const marketplaceRootUrl =
  process.env.REACT_APP_MARKETPLACE_ROOT_URL || PRODUCTION_ROOT_URL;

/**
 * Streams a PDF rental agreement for a confirmed booking transaction.
 *
 * Auth: uses the requesting user's own session (getSdk) - the Marketplace
 * API only returns a transaction to its own customer or provider, so no
 * extra participant check is needed here; an outsider's request simply
 * fails when fetching the transaction.
 *
 * Only available once the booking has actually been accepted (payment
 * captured, rental confirmed) - a contract for a still-pending request
 * would describe terms that might never happen.
 */
module.exports = (req, res) => {
  const { transactionId } = req.params;
  const forPaperSigning = req.query.mode === 'paper';
  const sdk = getSdk(req, res);

  Promise.all([
    sdk.transactions.show({
      id: transactionId,
      include: ['listing', 'provider', 'customer', 'booking'],
    }),
    // Signature messages are almost always posted right after acceptance,
    // so the first page comfortably covers the common case - see
    // findSignatures for how these get parsed back out.
    sdk.messages.query({
      transaction_id: transactionId,
      include: ['sender'],
      perPage: MESSAGES_PER_PAGE,
      page: 1,
    }),
  ])
    .then(([txResponse, messagesResponse]) => {
      const transaction = txResponse.data.data;
      const included = txResponse.data.included || [];

      const findIncluded = ref =>
        ref && included.find(inc => inc.type === ref.type && inc.id.uuid === ref.id.uuid);

      const listing = findIncluded(transaction.relationships?.listing?.data);
      const provider = findIncluded(transaction.relationships?.provider?.data);
      const customer = findIncluded(transaction.relationships?.customer?.data);
      const booking = findIncluded(transaction.relationships?.booking?.data);

      const hasBeenAccepted = (transaction.attributes.transitions || []).some(t =>
        ACCEPT_TRANSITIONS.includes(t.transition)
      );

      if (!hasBeenAccepted) {
        res.status(403).send('Huurovereenkomst is nog niet beschikbaar voor deze boeking.');
        return;
      }

      const messagesIncluded = messagesResponse.data.included || [];
      const messages = messagesResponse.data.data.map(message => {
        const senderRef = message.relationships?.sender?.data;
        const sender = senderRef
          ? messagesIncluded.find(inc => inc.type === senderRef.type && inc.id.uuid === senderRef.id.uuid)
          : null;
        return { ...message, sender };
      });
      const signatures = findSignatures(
        messages,
        transaction.relationships?.provider?.data?.id,
        transaction.relationships?.customer?.data?.id
      );

      const doc = buildContractPdf({
        transaction,
        listing,
        provider,
        customer,
        booking,
        signatures,
        marketplaceName: process.env.REACT_APP_MARKETPLACE_NAME,
        marketplaceRootUrl,
        forPaperSigning,
      });

      res
        .status(200)
        .set('Content-Type', 'application/pdf')
        .set('Content-Disposition', `attachment; filename="huurovereenkomst-${transactionId}.pdf"`);

      doc.pipe(res);
      doc.end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
