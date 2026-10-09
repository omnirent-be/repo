// Shared test/seed-listing detection, used by every public feed that
// queries listings directly (homepage rows, hero carousel, activity
// ticker) so none of them can individually forget to exclude test data.
//
// Two signals:
// - `metadata.isTest` - the long-term mechanism. Metadata (unlike
//   publicData) can only be set by the operator via Console or the
//   Integration API, never by the provider.
// - a title match on "safe to delete" - the naming convention already
//   used for this marketplace's current seed/test listings, so they
//   disappear from public feeds immediately without needing Console
//   access first.
export const isTestListing = listing => {
  const title = listing?.attributes?.title || '';
  return (
    listing?.attributes?.metadata?.isTest === true ||
    title.toLowerCase().includes('safe to delete')
  );
};

// A title under this length ("é", "k", "z", "a a") reads as test/seed
// data or a listing abandoned mid-draft, not something a real renter
// would publish - keep these out of public feeds even if not flagged
// isTest.
export const MIN_TITLE_LENGTH = 5;

export const hasUsableTitle = listing => {
  const title = listing?.attributes?.title || '';
  return title.trim().length >= MIN_TITLE_LENGTH;
};

// Same two-pronged idea as isTestListing, applied to the listing's author:
// a seed/e2e-test display name ("a a", "E2E P", "Provider A", "Wizard T")
// looks exactly as untrustworthy on a card as a test listing title does,
// even when the listing itself isn't flagged. "Wizard T" is this
// marketplace's own seed-data generator account (confirmed via its
// listings' own description text, e.g. "Testadvertentie - automatisch
// aangemaakt om infinite scroll te testen. Mag verwijderd worden.") - its
// listings otherwise have perfectly normal-looking titles, so without this
// they slip through every other check here.
export const isTestAuthorName = name => {
  const normalized = (name || '').trim();
  if (!normalized) {
    return false;
  }
  return (
    normalized.replace(/\s+/g, '').length <= 3 ||
    /^(e2e\b|provider [a-z]$|wizard\s)/i.test(normalized)
  );
};

export const isTestAuthor = author =>
  author?.attributes?.metadata?.isTest === true ||
  isTestAuthorName(author?.attributes?.profile?.displayName);

// The quality bar for showing a listing in a public results feed (search
// results, homepage sections): not test/seed data, a real title, and at
// least one real photo. Shared so every feed applies exactly the same bar -
// see SearchResultsPanel.js (where this filters what's rendered) and
// SearchPageWithGrid.js/SearchPageWithMap.js (where this decides whether to
// automatically fetch another page, since a filtered page can otherwise end
// up showing far fewer cards than its raw API page size, especially in a
// catalog where test data is still a large share of all listings).
export const isPubliclyPresentableListing = listing => {
  return (
    !isTestListing(listing) &&
    !isTestAuthor(listing?.author) &&
    hasUsableTitle(listing) &&
    listing?.images?.length > 0
  );
};
