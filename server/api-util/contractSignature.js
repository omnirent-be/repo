// Server-side counterpart of src/util/contractSignature.js - keep the
// marker/format in sync with that file. See its comment for why signing is
// implemented as a marked chat message rather than a transaction field.
const CONTRACT_SIGNATURE_MARKER = '[HUURCONTRACT-HANDTEKENING]';
const SIGNATURE_NAME_PATTERN = /^\[HUURCONTRACT-HANDTEKENING\]\s*(.+?)\s*—/;

const isContractSignatureMessage = content =>
  typeof content === 'string' && content.startsWith(CONTRACT_SIGNATURE_MARKER);

const parseSignatureName = content => {
  const match = SIGNATURE_NAME_PATTERN.exec(content || '');
  return match ? match[1].trim() : null;
};

/**
 * Finds each party's most recent signature message (if any) among a
 * transaction's messages.
 *
 * @param {Array} messages - message entities, each needs `attributes.content`,
 *   `attributes.createdAt` and a `sender` relationship resolved via `included`
 * @param {Object} providerId - transaction.relationships.provider.data.id
 * @param {Object} customerId - transaction.relationships.customer.data.id
 * @returns {{provider: {name: string, signedAt: string}|null, customer: {name: string, signedAt: string}|null}}
 */
const findSignatures = (messages, providerId, customerId) => {
  const signatureMessages = (messages || [])
    .filter(m => isContractSignatureMessage(m.attributes?.content))
    .sort((a, b) => new Date(a.attributes.createdAt) - new Date(b.attributes.createdAt));

  const latestFor = userId => {
    if (!userId) {
      return null;
    }
    const forUser = signatureMessages.filter(
      m => m.sender?.id?.uuid && m.sender.id.uuid === userId.uuid
    );
    const latest = forUser[forUser.length - 1];
    if (!latest) {
      return null;
    }
    const name = parseSignatureName(latest.attributes.content);
    return name ? { name, signedAt: latest.attributes.createdAt } : null;
  };

  return {
    provider: latestFor(providerId),
    customer: latestFor(customerId),
  };
};

module.exports = { isContractSignatureMessage, parseSignatureName, findSignatures };
