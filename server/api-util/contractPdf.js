const PDFDocument = require('pdfkit');
const { unitDivisor } = require('./currency');

// This reproduces the operator's own vetted contract template (received as
// a PDF, see conversation) as closely as pdfkit's simple drawing model
// allows - both the legal text AND the visual design (colors sampled
// directly from that PDF). Do not paraphrase or "improve" the legal text
// when editing this file; any wording change here is a real legal change
// to what OmniRent's contracts say.
//
// A few numbers in the source template were written in [brackets] as
// tunable policy parameters rather than per-booking values (e.g. "meld
// schade binnen [48] uur", "€ [50] per dag te laat"). They're pulled out
// here as constants so the operator can adjust them without editing prose.
const DAMAGE_REPORT_WINDOW_HOURS = 48; // section 6
const LATE_RETURN_FEE_PER_DAY_SUBUNITS = 5000; // section 9 - EUR 50,00
const LOST_AFTER_DAYS = 3; // section 9
const CANCEL_FULL_REFUND_HOURS = 48; // section 13
const OPERATOR_LEGAL_LINE = 'OmniRent (KBO 1038.335.411, Gent)';
const OPERATOR_FOOTER_LINE = 'OmniRent · KBO 1038.335.411 · Gent';

// "Huurovereenkomst" (not "huurcontract") is the term the Belgisch
// Burgerlijk Wetboek actually uses (art. 1708 e.v. oud BW / Boek 5 nieuw
// BW) - the overeenkomst is the parties' actual agreement, this PDF is
// just its instrumentum (bewijsdocument, Boek 8 BW). Using the precise
// term throughout also makes explicit that OmniRent itself is not a party
// to it, only the platform facilitating it.
const DOCUMENT_TITLE = 'Huurovereenkomst van Roerende Goederen';

// Fallback text for a handful of fields that genuinely have a sensible
// platform-wide default when the parties haven't specified anything more
// precise - shown as real (bold) text, not a dotted blank, since it IS the
// operative value unless overridden in the chat.
const DEFAULT_PICKUP_TIME_TEXT = 'Vanaf 10:00 uur (of zoals overeengekomen in chat)';
const DEFAULT_RETURN_TIME_TEXT = 'Uiterlijk 18:00 uur (of zoals overeengekomen in chat)';
const DEFAULT_ACCESSORIES_TEXT = 'Conform advertentiebeschrijving op OmniRent';

// Matches CONDITION_NEW/CONDITION_GOOD/CONDITION_LIGHT_WEAR in
// EditListingRentalDetailsForm.js - duplicated (server vs. client util,
// same convention as categorySuggestion.js's own duplication note) rather
// than shared across the client/server boundary.
const CONDITION_LABELS = {
  new: 'Nieuwstaat',
  good: 'Goede staat',
  'light-wear': 'Lichte gebruikssporen',
};
const conditionLabel = condition => CONDITION_LABELS[condition] || null;
const DEFAULT_SERIAL_NUMBER_TEXT = 'Niet gespecificeerd / niet van toepassing';

// Sampled directly from the source template PDF (header band / section
// badges, and the light card backgrounds).
const BRAND_TEAL = '#164C4D';
const CARD_BG = '#E8F1F0';
const MUTED_TEXT = '#666666';
const BLANK_TEXT = '#999999';

const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495; // A4 (595pt) minus left+right margins
const HEADER_HEIGHT = 60;
const CONTENT_TOP = HEADER_HEIGHT + 28;

const formatMoney = (amountInSubunits, currency) => {
  if (amountInSubunits == null || !currency) {
    return null;
  }
  const amount = amountInSubunits / unitDivisor(currency);
  return `€ ${amount.toFixed(2).replace('.', ',')}`;
};

const formatDate = isoString => {
  if (!isoString) {
    return null;
  }
  return new Date(isoString).toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatDateTime = isoString => {
  if (!isoString) {
    return null;
  }
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
  const timePart = date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} om ${timePart}`;
};

const displayName = user => user?.attributes?.profile?.displayName || null;

// Sharetribe's own displayName is privacy-abbreviated by default (e.g.
// "Jane D.", last name truncated to an initial) - fine for public listing
// pages, wrong on a legal contract that needs the huurder's actual full
// name. firstName/lastName are always collected at signup, so this only
// falls back to displayName for the rare older account missing them.
const legalFullName = user => {
  const { firstName, lastName } = user?.attributes?.profile || {};
  return firstName && lastName ? `${firstName} ${lastName}` : displayName(user);
};

const profileUrl = (marketplaceRootUrl, user) =>
  marketplaceRootUrl && user?.id?.uuid ? `${marketplaceRootUrl}/u/${user.id.uuid}` : null;

// `protectedData.shippingDetails` is only ever set when the customer chose
// shipping at checkout (see getShippingDetailsMaybe in
// CheckoutPageTransactionHelpers.js) - real contact/address data for the
// huurder in that case, simply absent for self-pickup bookings.
const shippingAddressLine = shippingDetails => {
  const address = shippingDetails?.address;
  if (!address?.line1) {
    return null;
  }
  return address.line2 ? `${address.line1}, ${address.line2}` : address.line1;
};

const shippingPostalCity = shippingDetails => {
  const address = shippingDetails?.address;
  if (!address?.postalCode && !address?.city) {
    return null;
  }
  return [address.postalCode, address.city].filter(Boolean).join(' ');
};

// The listing's own location (set by the provider, see AddressLinkMaybe.js)
// - real, always-available data for where the item actually is, regardless
// of delivery method.
const listingAddressLine = listing => {
  const location = listing?.attributes?.publicData?.location;
  if (!location?.address) {
    return null;
  }
  return location.building ? `${location.building}, ${location.address}` : location.address;
};

// A user's own home/legal address (protectedData.address, filled in via
// ProfileSettingsForm.js - visible here because provider and customer are
// counterparties on this transaction). Deliberately separate from
// shippingAddressLine above: this is where someone actually lives, not
// necessarily where a delivery-method booking's package should go.
const homeAddressLine = user => {
  const address = user?.attributes?.profile?.protectedData?.address;
  return address?.line1 || null;
};

const homePostalCity = user => {
  const address = user?.attributes?.profile?.protectedData?.address;
  if (!address?.postalCode && !address?.city) {
    return null;
  }
  return [address.postalCode, address.city].filter(Boolean).join(' ');
};

const userPhoneNumber = user => user?.attributes?.profile?.protectedData?.phoneNumber || null;

const formatBirthDate = isoDateString => {
  if (!isoDateString) {
    return null;
  }
  return new Date(isoDateString).toLocaleDateString('nl-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// A dotted "fill this in by hand" placeholder, matching how the paper
// version of this form works ("Vul dit samen in bij het ophalen"). Some
// fields (huurder's adres/Gsm via shippingDetails, ophaaladres via the
// listing's location) get filled in automatically when that data exists -
// see shippingAddressLine/shippingPostalCity/listingAddressLine above. The
// rest (verhuurder's adres/GSM/KBO, e-mail for either party, birth date,
// serial numbers, ...) simply isn't data this marketplace collects
// anywhere today, so it's always left blank here rather than guessed at.
const BLANK = '.'.repeat(30);

// ================ Low-level layout helpers ================ //

// The dark teal band at the very top of every page - drawn across the
// full page width (ignoring margins), with "OmniRent" on the left and a
// page-specific label on the right, exactly like the source template.
const pageBand = (doc, rightLabel) => {
  doc.rect(0, 0, doc.page.width, HEADER_HEIGHT).fill(BRAND_TEAL);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(15);
  doc.text('OmniRent', PAGE_MARGIN, 22, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10);
  const labelWidth = doc.widthOfString(rightLabel);
  doc.text(rightLabel, doc.page.width - PAGE_MARGIN - labelWidth, 25, { lineBreak: false });
  doc.fillColor('#000000');
  doc.x = PAGE_MARGIN;
  doc.y = CONTENT_TOP;
};

// A numbered circle badge followed by the section heading, both in the
// brand teal - matches the source template's "① Wie huurt van wie?" style.
const sectionBadge = (doc, number, title) => {
  doc.moveDown(1);
  const badgeSize = 20;
  const y = doc.y;
  doc.circle(PAGE_MARGIN + badgeSize / 2, y + badgeSize / 2, badgeSize / 2).fill(BRAND_TEAL);
  const numStr = String(number);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
  const numWidth = doc.widthOfString(numStr);
  doc.text(numStr, PAGE_MARGIN + badgeSize / 2 - numWidth / 2, y + badgeSize / 2 - 5, {
    lineBreak: false,
  });
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND_TEAL);
  doc.text(title, PAGE_MARGIN + badgeSize + 10, y + 2, { width: CONTENT_WIDTH - badgeSize - 10 });
  doc.y = Math.max(doc.y, y + badgeSize + 4);
  doc.x = PAGE_MARGIN;
  doc.fillColor('#000000').font('Helvetica').fontSize(10);
  doc.moveDown(0.5);
};

const paragraph = (doc, text, options = {}) => {
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  doc.text(text, { width: CONTENT_WIDTH, ...options });
};

const subHeading = (doc, text) => {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_TEAL).text(text);
  doc.fillColor('#000000').font('Helvetica').fontSize(10);
};

// A single "Label ....... value" line - filled in when the value is known,
// otherwise a dotted blank for the parties to write in by hand. `bold`
// renders the value in bold (used for the pricing card's "Totaal" row).
const field = (doc, label, value, options = {}) => {
  const width = options.width || CONTENT_WIDTH;
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  if (value) {
    doc.text(`${label} `, { continued: true, width });
    doc.font('Helvetica-Bold').text(value);
    doc.font('Helvetica');
  } else {
    doc.fillColor(BLANK_TEXT);
    doc.text(`${label} `, { continued: true, width });
    doc.text(BLANK);
    doc.fillColor('#000000');
  }
};

// A small checkbox glyph (☐/☑) inline before a label - matches the
// template's "☐ huurder haalt op en brengt terug" style.
const checkboxLine = (doc, checked, label) => {
  const boxSize = 9;
  doc.font('Helvetica').fontSize(10).fillColor('#000000');
  const y = doc.y + 1;
  doc.rect(PAGE_MARGIN, y, boxSize, boxSize).lineWidth(1).strokeColor(BRAND_TEAL).stroke();
  if (checked) {
    doc.rect(PAGE_MARGIN + 2, y + 2, boxSize - 4, boxSize - 4).fill(BRAND_TEAL);
  }
  doc.fillColor('#000000');
  doc.text(label, PAGE_MARGIN + boxSize + 8, doc.y, { width: CONTENT_WIDTH - boxSize - 8 });
};

// "Paraaf verhuurder ..... Paraaf huurder ....." footer on pages 1-5,
// pinned to a fixed position near the bottom of the page (drawn just
// before moving to the next page, so it never gets pushed around by
// however much content preceded it).
//
// Those dotted lines are only ever meant to be filled in by hand on a
// printed copy - when the contract was accepted entirely through the
// platform (the normal case; see the digital-confirmation card in section
// 16) and the caller isn't explicitly generating a "download to sign on
// paper" copy, blank paraaf lines would just be a permanently-empty field.
// `digitalTransactionId` (omitted for the paper variant) swaps them for a
// one-line reference to the real digital confirmation instead.
const initialsFooter = (doc, pageLabel, digitalTransactionId) => {
  const y = doc.page.height - 60;
  doc.font('Helvetica').fontSize(8).fillColor(MUTED_TEXT);
  if (digitalTransactionId) {
    doc.text(`Digitaal gevalideerd via Transactie-ID ${digitalTransactionId}`, PAGE_MARGIN, y, {
      width: 340,
    });
  } else {
    doc.text('Paraaf verhuurder', PAGE_MARGIN, y, { continued: true }).text(' ' + '.'.repeat(18));
    doc
      .text('Paraaf huurder', PAGE_MARGIN + 190, y, { continued: true })
      .text(' ' + '.'.repeat(18));
  }
  doc.font('Helvetica-Bold').fillColor(BRAND_TEAL);
  doc.text(pageLabel, PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  doc.fillColor('#000000');
};

const companyFooter = doc => {
  const y = doc.page.height - 60;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED_TEXT)
    .text(OPERATOR_FOOTER_LINE, PAGE_MARGIN, y);
  doc.font('Helvetica-Bold').fillColor(BRAND_TEAL);
  doc.text('omnirent.be · 6/6', PAGE_MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
  doc.fillColor('#000000');
};

// Draws a rounded card background from `y` down to whatever height the
// caller already knows it needs (computed from the number of fields it's
// about to render), and moves the cursor inside it.
const openCard = (doc, height, x = PAGE_MARGIN, width = CONTENT_WIDTH, padding = 14) => {
  const y = doc.y;
  doc.roundedRect(x, y, width, height, 8).fill(CARD_BG);
  doc.fillColor('#000000');
  doc.x = x + padding;
  doc.y = y + padding;
  return { cardX: x, cardY: y, cardWidth: width, innerWidth: width - padding * 2 };
};

const closeCard = (doc, cardY, height) => {
  doc.x = PAGE_MARGIN;
  doc.y = cardY + height + 14;
};

// Renders one party's block in the section 17 signature row at a fixed
// (x, y): their typed e-signature and when they placed it if they've
// signed digitally (see contractSignature.js), otherwise the blank
// "write your name + sign here" line for signing on paper instead - per
// section 16, either is valid, so this just shows whichever actually
// happened. Returns the y-coordinate right after this block, so the
// caller can align both columns to whichever one ran longer.
const renderSignatureBlock = (doc, x, y, width, label, signature) => {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_TEAL).text(label, x, y, { width });
  doc.fillColor('#000000');

  if (signature?.name) {
    doc
      .font('Helvetica-BoldOblique')
      .fontSize(15)
      .fillColor(BRAND_TEAL)
      .text(signature.name, x, doc.y + 6, { width });
    doc.fillColor('#000000');
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED_TEXT)
      .text(`Digitaal ondertekend op ${formatDateTime(signature.signedAt)} via OmniRent.`, x, doc.y + 2, {
        width,
      });
    doc.fillColor('#000000');
    return doc.y;
  }

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(BLANK_TEXT)
    .text('Naam ' + BLANK, x, doc.y + 4, { width });
  doc.fillColor('#000000');
  const boxY = doc.y + 6;
  const boxHeight = 55;
  doc.roundedRect(x, boxY, width, boxHeight, 6).fill(CARD_BG);
  doc.fillColor('#000000');
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(MUTED_TEXT)
    .text('Schrijf "gelezen en goedgekeurd" boven je handtekening', x, boxY + boxHeight + 6, { width });
  doc.fillColor('#000000');
  return boxY + boxHeight + 6 + doc.heightOfString(
    'Schrijf "gelezen en goedgekeurd" boven je handtekening',
    { width }
  );
};

/**
 * Builds a PDF rental agreement for a confirmed (accepted-or-later) booking
 * transaction, and returns the PDFDocument (a readable stream - callers
 * pipe it directly to the HTTP response, see server/api/contract.js).
 *
 * This mirrors the operator-supplied template's structure, legal text (17
 * numbered sections across 6 pages) and visual design verbatim, pre-filling
 * whatever the marketplace actually has on file (names, dates, price
 * breakdown, delivery method, deposit amount) and leaving a dotted blank
 * for anything the template itself expects to be filled in by hand at
 * pickup (postal address, GSM, KBO number, serial numbers, ...).
 *
 * @param {Object} params
 * @param {Object} params.transaction - full transaction entity (needs booking, lineItems, payinTotal, protectedData)
 * @param {Object} params.listing - listing entity
 * @param {Object} params.provider - provider user entity
 * @param {Object} params.customer - customer user entity
 * @param {Object} params.booking - booking entity (start/end)
 * @param {Object} [params.signatures] - `{ provider, customer }`, each `{name, signedAt}|null` -
 *   from server/api-util/contractSignature.js's findSignatures(), i.e. each party's own explicit
 *   e-signature (a marked chat message) if they've placed one. Falls back to a blank line for
 *   in-person signing when a party hasn't signed digitally.
 * @param {string} [params.marketplaceName]
 * @param {string} [params.marketplaceRootUrl] - used to build each party's "OmniRent-profiel" link
 * @param {boolean} [params.forPaperSigning] - true for the explicit "download and sign on paper"
 *   variant, which restores the blank paraaf lines on pages 1-5 instead of the digital-confirmation
 *   line (the normal, default download)
 * @returns {PDFDocument}
 */
const buildContractPdf = ({
  transaction,
  listing,
  provider,
  customer,
  booking,
  signatures,
  marketplaceName,
  marketplaceRootUrl,
  forPaperSigning = false,
}) => {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });

  const currency = transaction?.attributes?.payinTotal?.currency;
  const lineItems = (transaction?.attributes?.lineItems || []).filter(li => !li.reversal);
  const protectedData = transaction?.attributes?.protectedData || {};
  const listingTitle = listing?.attributes?.title || 'Verhuurd item';
  const publicData = listing?.attributes?.publicData || {};
  const depositInSubunits = publicData.depositInSubunits;
  const replacementValueInSubunits = publicData.replacementValueInSubunits;
  const quantity = protectedData.quantity || booking?.attributes?.seats || 1;

  const dayLineItem = lineItems.find(li => /^line-item\/(day|night|hour|fixed|item)$/.test(li.code));
  const shippingLineItem = lineItems.find(li => li.code === 'line-item/shipping-fee');
  // OmniRent's own customer-side service fee - already included in
  // payinTotal (hence in the "Totaal" row below) whether or not it's
  // itemized here, but leaving it out made that total look unexplained
  // (e.g. huurprijs + waarborg not adding up to "Totaal").
  const customerCommissionLineItem = lineItems.find(
    li => li.code === 'line-item/customer-commission'
  );
  const deliveryMethod = protectedData.deliveryMethod;
  const shippingDetails = protectedData.shippingDetails;

  // Where the item actually changes hands: the customer's shipping address
  // when the verhuurder delivers (and later picks up) themselves, otherwise
  // the listing's own location (self-pickup, same place both ways).
  const pickupReturnAddress =
    deliveryMethod === 'shipping' ? shippingAddressLine(shippingDetails) : listingAddressLine(listing);

  // 'individual' | 'company' | undefined, set during the provider's Stripe
  // Connect onboarding (see StripeConnectAccountForm.js) - a particulier
  // legally has no KBO number, so section 1 shows different things
  // depending on which this is (see the KBO-nr./Hoedanigheid rows below).
  const providerAccountType = provider?.attributes?.profile?.publicData?.accountType;
  const providerKboNumber = provider?.attributes?.profile?.publicData?.kboNumber || null;
  const payinInSubunits = transaction?.attributes?.payinTotal?.amount;
  const totalWithDepositInSubunits =
    payinInSubunits != null ? payinInSubunits + (depositInSubunits || 0) : null;

  // Section 16's own text says a platform confirmation (email, timestamp,
  // transaction ID) counts as acceptance under Book 8 BW - no separate
  // e-signature step needed. The customer "accepts" by confirming/paying
  // for the booking, the provider by accepting the request; both are real,
  // already-timestamped transitions on this transaction.
  const transitions = transaction?.attributes?.transitions || [];
  const findTransition = names => transitions.find(t => names.includes(t.transition));
  const providerAcceptedTransition = findTransition([
    'transition/accept',
    'transition/operator-accept',
  ]);
  const customerAcceptedTransition = findTransition([
    'transition/confirm-payment',
    'transition/request-payment',
    'transition/request-payment-after-inquiry',
  ]);

  // See initialsFooter() - only the default (non-paper) download replaces
  // the blank paraaf lines with this reference.
  const digitalTransactionId = forPaperSigning ? null : transaction?.id?.uuid;

  // ---------------- Page 1: intro + section 1 (parties) + section 2 ---------------- //
  pageBand(doc, 'Huur alles, van iedereen!');
  doc.font('Helvetica-Bold').fontSize(22).fillColor(BRAND_TEAL).text(DOCUMENT_TITLE);
  doc.fillColor('#000000');
  doc.moveDown(0.4);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(MUTED_TEXT)
    .text(
      'Duidelijke afspraken tussen huurder en verhuurder. Wettelijk bindende overeenkomst conform het Belgisch Burgerlijk Wetboek.'
    );
  doc.fillColor('#000000');
  doc.moveDown(0.8);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED_TEXT);
  doc
    .text('Overeenkomstnr.', { continued: true })
    .fillColor('#000000')
    .text(' ' + (transaction?.id?.uuid || BLANK));
  doc.fillColor(MUTED_TEXT).text('Boekingsreferentie', { continued: true }).fillColor('#000000');
  doc.text(' ' + (booking?.id?.uuid || BLANK));
  doc.fillColor(MUTED_TEXT).text('Datum van totstandkoming', { continued: true }).fillColor('#000000');
  doc.text(' ' + formatDate(new Date().toISOString()));
  doc.fillColor('#000000');

  sectionBadge(doc, 1, 'Wie huurt van wie?');
  const partyCardHeight = 190;
  const partyCardY = doc.y;
  const partyCardWidth = (CONTENT_WIDTH - 16) / 2;
  const partyFieldWidth = partyCardWidth - 28;
  const customerCardX = PAGE_MARGIN + partyCardWidth + 16;

  // Both cards use the same fixed-width column, so every field() call must
  // get an explicit width (the card is much narrower than CONTENT_WIDTH,
  // the default) and doc.x must be re-pinned before each call - a
  // continued-text run leaves doc.x wherever pdfkit's own line-wrap left
  // it, not necessarily back at the card's left edge.
  const partyField = (cardX, label, value) => {
    doc.x = cardX + 14;
    field(doc, label, value, { width: partyFieldWidth });
  };

  doc.roundedRect(PAGE_MARGIN, partyCardY, partyCardWidth, partyCardHeight, 8).fill(CARD_BG);
  doc.fillColor('#000000');
  doc.x = PAGE_MARGIN + 14;
  doc.y = partyCardY + 14;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(BRAND_TEAL)
    .text('Verhuurder', { width: partyFieldWidth });
  doc.fillColor('#000000');
  partyField(PAGE_MARGIN, 'Volledige naam of bedrijf', displayName(provider));
  partyField(PAGE_MARGIN, 'Domicilie of zetel', homeAddressLine(provider));
  partyField(PAGE_MARGIN, 'Postcode en gemeente', homePostalCity(provider));
  partyField(PAGE_MARGIN, 'Gsm', userPhoneNumber(provider));
  partyField(PAGE_MARGIN, 'E-mail', null);
  // A particulier legally has no KBO number at all - showing a blank line
  // for one would wrongly imply it's missing data rather than not
  // applicable. Only a company account shows this line (with its number
  // once that's on file, see providerKboNumber above).
  if (providerAccountType === 'company') {
    partyField(PAGE_MARGIN, 'KBO-nr.', providerKboNumber);
  } else if (providerAccountType === 'individual') {
    partyField(PAGE_MARGIN, 'Hoedanigheid', 'Particuliere verhuurder');
  }
  partyField(PAGE_MARGIN, 'OmniRent-profiel', profileUrl(marketplaceRootUrl, provider));

  doc.roundedRect(customerCardX, partyCardY, partyCardWidth, partyCardHeight, 8).fill(CARD_BG);
  doc.fillColor('#000000');
  doc.x = customerCardX + 14;
  doc.y = partyCardY + 14;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(BRAND_TEAL)
    .text('Huurder', { width: partyFieldWidth });
  doc.fillColor('#000000');
  partyField(customerCardX, 'Volledige naam', legalFullName(customer));
  partyField(
    customerCardX,
    'Domicilieadres',
    homeAddressLine(customer) || shippingAddressLine(shippingDetails)
  );
  partyField(
    customerCardX,
    'Postcode en gemeente',
    homePostalCity(customer) || shippingPostalCity(shippingDetails)
  );
  partyField(customerCardX, 'Gsm', userPhoneNumber(customer) || shippingDetails?.phoneNumber || null);
  partyField(customerCardX, 'E-mail', null);
  partyField(
    customerCardX,
    'Geboortedatum',
    formatBirthDate(customer?.attributes?.profile?.protectedData?.birthDate)
  );
  partyField(customerCardX, 'OmniRent-profiel', profileUrl(marketplaceRootUrl, customer));

  doc.x = PAGE_MARGIN;
  doc.y = partyCardY + partyCardHeight + 18;

  sectionBadge(doc, 2, 'Wat doet OmniRent?');
  paragraph(
    doc,
    `${OPERATOR_LEGAL_LINE} is een online platform dat verhuurders en huurders samenbrengt. OmniRent regelt de betaling en de waarborg en helpt als jullie er samen niet uitkomen.`
  );
  doc.moveDown(0.3);
  paragraph(
    doc,
    'OmniRent is alleen tussenpersoon. OmniRent is geen partij in deze huurovereenkomst en is geen eigenaar, verhuurder of verzekeraar van het materiaal. Deze overeenkomst loopt enkel tussen verhuurder en huurder.'
  );
  doc.moveDown(0.3);
  paragraph(
    doc,
    'OmniRent is dus niet aansprakelijk voor de staat, verborgen gebreken, het gebruik of de veiligheid van het materiaal, en ook niet voor letsel of schade die daaruit volgt.'
  );
  doc.moveDown(0.3);
  paragraph(doc, 'De algemene voorwaarden op omnirent.be horen bij deze overeenkomst.');

  initialsFooter(doc, 'omnirent.be · 1/6', digitalTransactionId);
  doc.addPage();

  // ---------------- Page 2: section 3 (item) + section 4 (when/where) ---------------- //
  pageBand(doc, DOCUMENT_TITLE);

  sectionBadge(doc, 3, 'Wat huur je?');
  paragraph(
    doc,
    'Noteer alles zo precies mogelijk: merk, model, serienummer en alle toebehoren, zoals verlengkabels, grondharingen, een blower of een gasfles.'
  );
  doc.moveDown(0.3);
  paragraph(
    doc,
    'De vervangwaarde is de nieuwwaarde van het item. Die telt als iets kwijt of onherstelbaar kapot is (zie punt 10).'
  );
  doc.moveDown(0.5);
  {
    const cardHeight = 134;
    const { cardY, innerWidth } = openCard(doc, cardHeight);
    field(doc, 'Wat (merk en model)', listingTitle, { width: innerWidth });
    field(doc, 'Serienr.', publicData.serialNumber || DEFAULT_SERIAL_NUMBER_TEXT, {
      width: innerWidth,
    });
    field(doc, 'Toebehoren', publicData.accessories || DEFAULT_ACCESSORIES_TEXT, {
      width: innerWidth,
    });
    field(doc, 'Staat bij verhuur', conditionLabel(publicData.condition), { width: innerWidth });
    field(doc, 'Aantal', String(quantity), { width: innerWidth });
    field(doc, 'Vervangwaarde', formatMoney(replacementValueInSubunits, currency), {
      width: innerWidth,
    });
    closeCard(doc, cardY, cardHeight);
  }
  paragraph(doc, 'Meer spullen? Voeg een extra blad toe en laat het door jullie allebei tekenen.');
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text('Het blijft van de verhuurder.', { continued: true });
  doc
    .font('Helvetica')
    .text(
      ' Het materiaal blijft altijd eigendom van de verhuurder. De huurder mag het nooit verkopen, verpanden, onderverhuren, uitlenen of aan iemand anders geven.'
    );

  sectionBadge(doc, 4, 'Wanneer en waar?');
  field(doc, 'Ophalen: dag, datum', formatDate(booking?.attributes?.start));
  field(doc, 'Ophalen: uur', DEFAULT_PICKUP_TIME_TEXT);
  field(doc, 'Ophalen: adres', pickupReturnAddress);
  doc.moveDown(0.3);
  field(doc, 'Terugbrengen: dag, datum', formatDate(booking?.attributes?.end));
  field(doc, 'Terugbrengen: uur', DEFAULT_RETURN_TIME_TEXT);
  field(doc, 'Terugbrengen: adres', pickupReturnAddress);
  doc.moveDown(0.4);
  checkboxLine(doc, deliveryMethod === 'pickup', 'Huurder haalt op en brengt terug');
  doc.moveDown(0.4);
  checkboxLine(
    doc,
    deliveryMethod === 'shipping',
    `Verhuurder levert en haalt op, voor ${formatMoney(shippingLineItem?.lineTotal?.amount, currency) ||
      '€ ...'}`
  );
  doc.moveDown(0.4);
  paragraph(
    doc,
    'Vul altijd het exacte uur in, bv. zondag 4 oktober 2026 om 18:00. Dat uur telt voor punt 9.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Iets anders afgesproken? Zet het in de chat op OmniRent, dan staat het zwart op wit.');

  initialsFooter(doc, 'omnirent.be · 2/6', digitalTransactionId);
  doc.addPage();

  // ---------------- Page 3: section 5 (price) + 6 (deposit) + 7 (photos) ---------------- //
  pageBand(doc, DOCUMENT_TITLE);

  sectionBadge(doc, 5, 'Wat kost het?');
  {
    const cardHeight = 106;
    const { cardY, innerWidth } = openCard(doc, cardHeight);
    const unitAmount = dayLineItem?.unitPrice?.amount;
    const unitLabel =
      dayLineItem?.code === 'line-item/night'
        ? 'per nacht'
        : dayLineItem?.code === 'line-item/hour'
        ? 'per uur'
        : dayLineItem?.code === 'line-item/fixed' || dayLineItem?.code === 'line-item/item'
        ? ''
        : 'per dag';
    const unitCount = dayLineItem?.quantity != null ? String(dayLineItem.quantity) : null;
    field(
      doc,
      'Huurprijs',
      unitAmount != null
        ? `${formatMoney(unitAmount, currency)} ${unitLabel}${
            unitCount ? ` × ${unitCount}` : ''
          } = ${formatMoney(dayLineItem?.lineTotal?.amount, currency)}`
        : null,
      { width: innerWidth }
    );
    field(
      doc,
      'Levering en ophaling (optioneel)',
      shippingLineItem ? formatMoney(shippingLineItem.lineTotal?.amount, currency) : null,
      { width: innerWidth }
    );
    field(
      doc,
      'Platform-/servicekost OmniRent',
      customerCommissionLineItem
        ? formatMoney(customerCommissionLineItem.lineTotal?.amount, currency)
        : null,
      { width: innerWidth }
    );
    field(doc, 'Waarborg (zie punt 6)', formatMoney(depositInSubunits, currency), { width: innerWidth });
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_TEAL);
    doc.text('Totaal via OmniRent ', { continued: true, width: innerWidth });
    doc.text(formatMoney(totalWithDepositInSubunits, currency) || BLANK);
    doc.fillColor('#000000').font('Helvetica').fontSize(10);
    closeCard(doc, cardY, cardHeight);
  }
  paragraph(doc, 'Je betaalt alles via OmniRent, veilig en in één keer.');
  doc.moveDown(0.2);
  paragraph(
    doc,
    'De verhuurder krijgt de huurprijs uitbetaald na een geslaagde teruggave. OmniRent houdt daarbij 5% commissie in.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Betaal nooit buiten het platform: dan ben je niet beschermd en kan OmniRent je niet helpen.');

  sectionBadge(doc, 6, 'De waarborg');
  paragraph(
    doc,
    'De waarborg is een vast bedrag in euro, bepaald op basis van de waarde van het materiaal (zie punt 5).'
  );
  doc.moveDown(0.2);
  paragraph(
    doc,
    'De verhuurder, of OmniRent namens de verhuurder, mag de waarborg helemaal of deels inhouden voor:'
  );
  paragraph(doc, '• zichtbare schade of breuk;');
  paragraph(doc, '• materiaal dat vuil of onvolledig terugkomt (reinigingskosten of ontbrekende stukken);');
  paragraph(doc, '• te laat terugbrengen (zie punt 9).');
  doc.moveDown(0.2);
  paragraph(
    doc,
    `Geen schademelding binnen ${DAMAGE_REPORT_WINDOW_HOURS} uur na het terugbrengen? Dan krijgt de huurder de waarborg volledig terug.`
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Is de schade groter dan de waarborg, dan betaalt de huurder het verschil bij.');

  sectionBadge(doc, 7, 'Foto-check bij ophalen en terugbrengen');
  paragraph(
    doc,
    'Bij het ophalen (check-in) en het terugbrengen (check-out) laden jullie allebei minstens 3 duidelijke foto’s per item op in de OmniRent-app.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Die foto’s gelden als plaatsbeschrijving die jullie allebei aanvaarden.');
  doc.moveDown(0.2);
  paragraph(doc, 'De verhuurder toont hoe alles veilig werkt.');
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Zie je als huurder een gebrek? Meld het vóór je iets gebruikt. Zonder opmerkingen geldt: alles compleet en in orde ontvangen.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'De huurder brengt alles terug in dezelfde staat, behalve normale slijtage.');

  initialsFooter(doc, 'omnirent.be · 3/6', digitalTransactionId);
  doc.addPage();

  // ---------------- Page 4: section 8 (safe use) ---------------- //
  pageBand(doc, DOCUMENT_TITLE);

  sectionBadge(doc, 8, 'Veilig gebruik');
  paragraph(doc, 'De huurder gebruikt het materiaal als een voorzichtig en redelijk persoon. Concreet:');
  paragraph(doc, '• alleen gebruiken waarvoor het dient, volgens de handleiding en de uitleg van de verhuurder;');
  paragraph(doc, '• zelf niets aanpassen of herstellen;');
  paragraph(doc, '• beschermen tegen regen, vocht, vuur en diefstal, en nooit onbewaakt achterlaten;');
  paragraph(doc, '• alles proper, droog en compleet terugbrengen;');
  paragraph(doc, '• schade of problemen meteen melden via OmniRent.');

  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND_TEAL).text('Extra regels per soort materiaal');
  doc.fillColor('#000000').font('Helvetica').fontSize(10);

  subHeading(doc, 'Springkasteel');
  paragraph(
    doc,
    'Altijd een volwassene erbij. Geen schoenen, scherpe voorwerpen, eten of drinken op het kasteel. Meteen leeg laten lopen bij wind vanaf 4 Beaufort.'
  );

  subHeading(doc, 'Tent');
  paragraph(
    doc,
    'Geen open vuur of warmtebron (bbq, terrasverwarmer) in of vlak onder de tent, tenzij de verhuurder dat schriftelijk goedkeurt. Bij harde wind de tent volledig sluiten en goed verankeren.'
  );

  subHeading(doc, 'Bbq en plancha');
  paragraph(
    doc,
    'Stabiel op een vlakke ondergrond, uit de buurt van alles wat kan branden. Blijf erbij tot het vuur volledig gedoofd is.'
  );

  initialsFooter(doc, 'omnirent.be · 4/6', digitalTransactionId);
  doc.addPage();

  // ---------------- Page 5: sections 9-13 ---------------- //
  pageBand(doc, DOCUMENT_TITLE);

  sectionBadge(doc, 9, 'Te laat terug?');
  paragraph(
    doc,
    'Het uur van terugbrengen uit punt 4 is het uur. Wordt het later, laat het dan meteen weten via OmniRent.'
  );
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Te laat zonder akkoord van de verhuurder? Dan betaalt de huurder automatisch, zonder dat er eerst een aanmaning nodig is:'
  );
  paragraph(doc, '• de dagprijs voor elke begonnen dag vertraging;');
  paragraph(
    doc,
    `• plus een vaste schadevergoeding van ${formatMoney(
      LATE_RETURN_FEE_PER_DAY_SUBUNITS,
      'EUR'
    )} per dag, bv. omdat een volgende huurder moet wachten.`
  );
  doc.moveDown(0.2);
  paragraph(
    doc,
    `Na ${LOST_AFTER_DAYS} dagen zonder nieuws mag de verhuurder het materiaal als verloren beschouwen en de vervangwaarde aanrekenen.`
  );

  sectionBadge(doc, 10, 'Oeps, er ging iets mis');
  paragraph(
    doc,
    'Van het ophalen tot het terugbrengen is de huurder volledig verantwoordelijk voor het materiaal. Dat geldt ook als de schade komt van gasten of anderen.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Normale slijtage en gebreken die er al waren tellen niet mee.');
  doc.moveDown(0.2);
  paragraph(doc, 'Herstelbare schade: de huurder betaalt de echte herstelkost, met een factuur of offerte als bewijs.');
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Kwijt, gestolen of niet meer te herstellen: de huurder betaalt de vervangwaarde, dus de nieuwwaarde min een redelijke afschrijving voor ouderdom.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Bij diefstal doet de huurder binnen 24 uur aangifte bij de politie en bezorgt die via OmniRent.');

  sectionBadge(doc, 11, 'Verzekering');
  paragraph(
    doc,
    'De huurder verklaart een geldige familiale verzekering (burgerlijke aansprakelijkheid privéleven) te hebben voor schade aan anderen.'
  );
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Let op: een familiale dekt meestal geen schade aan het gehuurde materiaal zelf. Daarvoor blijft de huurder zelf verantwoordelijk (punt 10).'
  );

  sectionBadge(doc, 12, 'Slecht weer');
  paragraph(
    doc,
    'Regen, wind of storm? De verhuurder is niet verantwoordelijk als je feest in het water valt door het weer.'
  );
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Schade door noodweer is voor de huurder als die de tent of het springkasteel niet op tijd afbreekt, leeg laat lopen of verankert.'
  );
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Code oranje of code rood uitgevaardigd door het KMI (Koninklijk Meteorologisch Instituut) voor rukwinden of onweer geldt als erkend risico waarbij opblaasbare en lichte structuren verplicht buiten gebruik moeten worden gesteld.'
  );
  doc.moveDown(0.2);
  paragraph(doc, 'Wil je annuleren door het weer? Dan gelden de gewone regels van punt 13.');

  sectionBadge(doc, 13, 'Annuleren');
  paragraph(doc, 'Annuleren doe je altijd via OmniRent.');
  paragraph(doc, 'De waarborg krijg je in elk geval volledig terug.');
  paragraph(doc, `Huurder annuleert tot ${CANCEL_FULL_REFUND_HOURS} uur voor het ophalen: alles wordt terugbetaald.`);
  paragraph(doc, 'Huurder annuleert later: de huurprijs wordt niet terugbetaald.');
  paragraph(doc, 'Verhuurder annuleert: de huurder krijgt alles terug.');
  doc.moveDown(0.2);
  paragraph(
    doc,
    `Indien de verhuurder minder dan ${CANCEL_FULL_REFUND_HOURS} uur vooraf annuleert buiten overmacht, bemiddelt OmniRent kosteloos voor een gelijkwaardig alternatief of passende compensatie.`
  );

  initialsFooter(doc, 'omnirent.be · 5/6', digitalTransactionId);
  doc.addPage();

  // ---------------- Page 6: sections 14-17 + signatures ---------------- //
  pageBand(doc, DOCUMENT_TITLE);

  sectionBadge(doc, 14, 'Jullie gegevens');
  paragraph(doc, 'Jullie gebruiken elkaars gegevens alleen voor deze huur.');
  doc.moveDown(0.2);
  paragraph(doc, `${OPERATOR_LEGAL_LINE} verwerkt ze volgens de privacyverklaring op omnirent.be en de GDPR.`);

  sectionBadge(doc, 15, 'Niet eens?');
  paragraph(doc, 'Praat eerst samen. Lukt dat niet, dan bemiddelt OmniRent.');
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Na 30 dagen nog geen oplossing? Dan geldt het Belgisch recht en zijn uitsluitend de rechtbanken van het arrondissement Gent bevoegd, tenzij de wet voor consumenten iets anders voorschrijft.'
  );

  sectionBadge(doc, 16, 'Digitaal of op papier tekenen');
  paragraph(doc, 'Jullie kunnen deze overeenkomst op papier tekenen of digitaal aanvaarden via OmniRent.');
  doc.moveDown(0.2);
  paragraph(
    doc,
    'Digitaal aanvaarden gebeurt volgens Boek 8 van het Burgerlijk Wetboek (bewijsrecht). De bevestiging via het platform, met e-mail, tijdstip en een uniek transactie-ID, telt even zwaar als een handgeschreven handtekening.'
  );

  // The concrete proof this clause refers to - already captured by the
  // platform the moment each party actually confirmed the booking, so
  // there's nothing left to "sign" when the whole rental was booked
  // through the app.
  if (providerAcceptedTransition || customerAcceptedTransition) {
    doc.moveDown(0.4);
    const cardHeight =
      36 +
      14 * [providerAcceptedTransition, customerAcceptedTransition].filter(Boolean).length;
    const { cardY, innerWidth } = openCard(doc, cardHeight);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BRAND_TEAL)
      .text('Digitale bevestiging van deze overeenkomst', { width: innerWidth });
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    doc.text(`Transactie-ID: ${transaction?.id?.uuid || BLANK}`, { width: innerWidth });
    if (providerAcceptedTransition) {
      doc.text(
        `Verhuurder ${displayName(provider) || ''}: digitaal aanvaard op ${formatDateTime(
          providerAcceptedTransition.createdAt
        )} via OmniRent.`,
        { width: innerWidth }
      );
    }
    if (customerAcceptedTransition) {
      doc.text(
        `Huurder ${displayName(customer) || ''}: digitaal aanvaard op ${formatDateTime(
          customerAcceptedTransition.createdAt
        )} via OmniRent.`,
        { width: innerWidth }
      );
    }
    closeCard(doc, cardY, cardHeight);
    paragraph(
      doc,
      'Is deze boeking volledig via de app verlopen? Dan geldt bovenstaande bevestiging als aanvaarding en zijn de handtekeningen bij punt 17 niet nodig. Wil je toch (ook) op papier tekenen, dat kan uiteraard ook.'
    );
  }

  sectionBadge(doc, 17, 'Extra afspraken');
  {
    const cardHeight = 60;
    const cardY = doc.y;
    doc.roundedRect(PAGE_MARGIN, cardY, CONTENT_WIDTH, cardHeight, 8).fill(CARD_BG);
    doc.fillColor('#000000');
    doc.y = cardY + cardHeight + 14;
    doc.x = PAGE_MARGIN;
  }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND_TEAL).text('Deal? Samen tekenen.');
  doc.fillColor('#000000').font('Helvetica').fontSize(10);
  doc.moveDown(0.3);
  if (forPaperSigning) {
    doc
      .text('Opgemaakt in twee exemplaren te ', { continued: true })
      .text(BLANK, { continued: true })
      .text(' op ', { continued: true })
      .text(BLANK, { continued: true })
      .text('. Elk van jullie krijgt er één.');
  } else {
    doc.text(
      `Digitaal gegenereerd en geregistreerd op OmniRent op ${formatDateTime(
        new Date().toISOString()
      )}.`
    );
  }

  doc.moveDown(1);
  const signatureColumnWidth = 220;
  const signatureY = doc.y;
  const signatureBottomProvider = renderSignatureBlock(
    doc,
    PAGE_MARGIN,
    signatureY,
    signatureColumnWidth,
    'Verhuurder',
    signatures?.provider
  );
  const signatureBottomCustomer = renderSignatureBlock(
    doc,
    PAGE_MARGIN + 270,
    signatureY,
    signatureColumnWidth,
    'Huurder',
    signatures?.customer
  );
  doc.y = Math.max(signatureBottomProvider, signatureBottomCustomer);
  doc.x = PAGE_MARGIN;

  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND_TEAL).text('Veel feestplezier!');
  doc.fillColor('#000000');

  companyFooter(doc);

  return doc;
};

module.exports = { buildContractPdf };
