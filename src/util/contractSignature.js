// "Signing" a rental contract is implemented as a specially-marked chat
// message on the transaction, not a new field on the transaction itself -
// Sharetribe's Marketplace API only lets protectedData/metadata be written
// through an actual process transition, and adding a dedicated transition
// for this would mean editing and redeploying the transaction process
// (ext/transaction-processes/...), a live-process change out of scope
// here. Messages, by contrast, are always postable regardless of state and
// are already visible to both customer and provider - a good fit.
//
// NOTE: keep MARKER and the message format in sync with
// server/api-util/contractSignature.js, which parses it back out when
// building the contract PDF (same client/server duplication pattern
// already used for typeHandlers between src/util/api.js and
// server/api-util/sdk.js).
export const CONTRACT_SIGNATURE_MARKER = '[HUURCONTRACT-HANDTEKENING]';

export const formatContractSignatureMessage = name =>
  `${CONTRACT_SIGNATURE_MARKER} ${name} — "Gelezen en goedgekeurd". Digitaal ondertekend via OmniRent.`;

export const isContractSignatureMessage = content =>
  typeof content === 'string' && content.startsWith(CONTRACT_SIGNATURE_MARKER);

const SIGNATURE_NAME_PATTERN = /^\[HUURCONTRACT-HANDTEKENING\]\s*(.+?)\s*—/;

export const parseContractSignatureName = content => {
  const match = SIGNATURE_NAME_PATTERN.exec(content || '');
  return match ? match[1].trim() : null;
};
