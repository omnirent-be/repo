import React, { useState, useEffect, useRef } from 'react';
import { Field } from 'react-final-form';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { createSlug } from '../../util/urlHelpers';
import { pathByRouteName } from '../../util/routes';
import { fetchListingSuggestionsThunk } from '../../ducks/listingSuggestions.duck';

import OutsideClickHandler from '../OutsideClickHandler/OutsideClickHandler';

import css from './ProductSearchField.module.css';

const DEBOUNCE_MS = 300;
const MIN_CHARS_FOR_LISTING_SUGGESTIONS = 2;
const DEFAULT_CATEGORY_SUGGESTIONS_COUNT = 6;

const ProductSearchFieldComponent = props => {
  const { input, alignLeft, className, rootClassName } = props;
  const { value, onChange } = input;
  const text = value?.text || '';

  const intl = useIntl();
  const dispatch = useDispatch();
  const history = useHistory();
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();

  const [isOpen, setIsOpen] = useState(false);
  const [listingMatches, setListingMatches] = useState([]);
  const debounceRef = useRef(null);

  const topCategory = config.categoryConfiguration?.categories?.[0];
  const subcategories = topCategory?.subcategories || [];

  // With no text yet, suggest a handful of subcategories up front (e.g.
  // "Entertainment & Kinderanimatie") instead of showing an empty dropdown
  // until the visitor starts typing.
  const categoryMatches =
    text.length > 0
      ? subcategories.filter(sub => sub.name.toLowerCase().includes(text.toLowerCase()))
      : subcategories.slice(0, DEFAULT_CATEGORY_SUGGESTIONS_COUNT);
  const showingDefaultCategories = text.length === 0 && categoryMatches.length > 0;

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (text.length < MIN_CHARS_FOR_LISTING_SUGGESTIONS || value?.category) {
      setListingMatches([]);
      return undefined;
    }
    debounceRef.current = setTimeout(() => {
      dispatch(fetchListingSuggestionsThunk({ keywords: text }))
        .unwrap()
        .then(setListingMatches)
        .catch(() => setListingMatches([]));
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const handleTextChange = e => {
    onChange({ text: e.target.value, category: null });
    setIsOpen(true);
  };

  const handleCategorySelect = sub => {
    onChange({ text: sub.name, category: { topCategoryId: topCategory.id, subCategoryId: sub.id } });
    setListingMatches([]);
    setIsOpen(false);
  };

  const handleListingSelect = listing => {
    setIsOpen(false);
    const to = pathByRouteName('ListingPage', routeConfiguration, {
      id: listing.id,
      slug: createSlug(listing.title),
    });
    history.push(to);
  };

  const hasSuggestions = categoryMatches.length > 0 || listingMatches.length > 0;
  const rootClass = rootClassName || css.root;

  return (
    <OutsideClickHandler
      className={classNames(rootClass, className)}
      onOutsideClick={() => setIsOpen(false)}
    >
      <input
        type="text"
        className={css.input}
        value={text}
        onChange={handleTextChange}
        onFocus={() => setIsOpen(true)}
        placeholder={intl.formatMessage({ id: 'ProductSearchField.placeholder' })}
        aria-label={intl.formatMessage({ id: 'ProductSearchField.placeholder' })}
        autoComplete="off"
      />
      {isOpen && hasSuggestions ? (
        <ul
          className={classNames(css.dropdownContent, { [css.alignLeft]: alignLeft })}
          role="listbox"
        >
          {categoryMatches.length > 0 ? (
            <li className={css.groupLabel} aria-hidden="true">
              <FormattedMessage
                id={
                  showingDefaultCategories
                    ? 'ProductSearchField.popularCategoriesGroupLabel'
                    : 'ProductSearchField.categoriesGroupLabel'
                }
              />
            </li>
          ) : null}
          {categoryMatches.map(sub => (
            <li
              key={sub.id}
              className={css.option}
              role="option"
              aria-selected="false"
              onClick={() => handleCategorySelect(sub)}
            >
              {sub.name}
            </li>
          ))}
          {listingMatches.length > 0 ? (
            <li className={css.groupLabel} aria-hidden="true">
              <FormattedMessage id="ProductSearchField.listingsGroupLabel" />
            </li>
          ) : null}
          {listingMatches.map(listing => (
            <li
              key={listing.id}
              className={css.option}
              role="option"
              aria-selected="false"
              onClick={() => handleListingSelect(listing)}
            >
              {listing.title}
            </li>
          ))}
        </ul>
      ) : null}
    </OutsideClickHandler>
  );
};

/**
 * The "Product" field of the unified search module (homepage conversion
 * audit, Oct 2026): a single text input that suggests both matching
 * categories (instant, client-side, from config.categoryConfiguration's
 * subcategories) and matching real listings (debounced sdk.listings.query)
 * as the visitor types - "autocomplete met producten én categorieën" per
 * the audit's own field spec. Before any text is typed, it already shows a
 * handful of subcategories as suggestions (DEFAULT_CATEGORY_SUGGESTIONS_COUNT)
 * so the field isn't an empty dead end on focus. Selecting a category suggestion sets that
 * category as the value's `category`; selecting a listing suggestion
 * navigates straight to it. Submitting without picking a suggestion is
 * still meaningful - the caller falls back to a plain keyword search using
 * the typed text, never a dead end.
 *
 * Field value shape: `{ text: string, category: {topCategoryId, subCategoryId}|null }`.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.name] Final Form field name, defaults to "product"
 * @param {boolean} [props.alignLeft] aligns the suggestions dropdown to the left instead of the right
 * @returns {JSX.Element}
 */
const ProductSearchField = props => {
  const { name = 'product', className, rootClassName, alignLeft } = props;
  return (
    <Field
      name={name}
      component={ProductSearchFieldComponent}
      className={className}
      rootClassName={rootClassName}
      alignLeft={alignLeft}
    />
  );
};

export default ProductSearchField;
