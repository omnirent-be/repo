import React, { useState } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';
import { useHistory } from 'react-router-dom';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { useConfiguration } from '../../context/configurationContext';

import { FormattedMessage } from '../../util/reactIntl';
import { createResourceLocatorString } from '../../util/routes';
import { isOriginInUse } from '../../util/search';
import { stringifyDateToISO8601 } from '../../util/dates';
import { trackEvent } from '../../util/analytics';

import { Form, PrimaryButton, ProductSearchField } from '../../components';
import FilterLocation from '../../containers/PageBuilder/Primitives/SearchCTA/FilterLocation/FilterLocation';
import FilterDateRange from '../../containers/PageBuilder/Primitives/SearchCTA/FilterDateRange/FilterDateRange';
import defaultLocations from '../../config/configDefaultLocationSearches';

import css from '../../containers/PageBuilder/Primitives/SearchCTA/SearchCTA.module.css';

const GENT_DEFAULT = defaultLocations.find(l => l.id === 'default-gent');

const formatDateValue = (dateRange, queryParamName) => {
  const { startDate, endDate } = dateRange || {};
  const start = startDate ? stringifyDateToISO8601(startDate) : null;
  const end = endDate ? stringifyDateToISO8601(endDate) : null;
  const value = start && end ? `${start},${end}` : null;
  return { [queryParamName]: value };
};

/**
 * The one unified search module used both in the homepage hero and (in a
 * compact variant) in the site header (see SearchCapsule.js) - a single
 * predictable search model instead of two different interfaces, per the
 * Oct 2026 conversion audit. Three fields plus an action, exactly as
 * specified there:
 *  - Product ("Wat zoek je?"): ProductSearchField, autocomplete over both
 *    categories and real listings.
 *  - Locatie ("Gent of postcode"): the existing geo location autocomplete,
 *    prefilled with Gent but editable.
 *  - Datum ("Wanneer?"): a date range, never required - the audit
 *    explicitly asks to allow searching without a date and ask again on
 *    the results/listing page.
 *
 * @component
 * @returns {JSX.Element}
 */
const UnifiedSearchForm = () => {
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();
  const config = useConfiguration();
  const [submitDisabled, setSubmitDisabled] = useState(false);

  const initialValues = GENT_DEFAULT
    ? {
        location: {
          search: GENT_DEFAULT.predictionPlace.address,
          predictions: [],
          selectedPlace: GENT_DEFAULT.predictionPlace,
        },
      }
    : {};

  const onSubmit = values => {
    const queryParams = {};
    const { product, location, dateRange } = values;

    if (product?.category) {
      queryParams.pub_categoryLevel1 = product.category.topCategoryId;
      queryParams.pub_categoryLevel2 = product.category.subCategoryId;
    } else if (product?.text) {
      queryParams.keywords = product.text;
    }

    if (location?.selectedPlace) {
      const {
        search,
        selectedPlace: { origin, bounds },
      } = location;
      queryParams.bounds = bounds;
      queryParams.address = search;
      if (isOriginInUse(config) && origin) {
        queryParams.origin = `${origin.lat},${origin.lng}`;
      }
    }

    const { dates } = formatDateValue(dateRange, 'dates');
    if (dates) {
      queryParams.dates = dates;
    }

    trackEvent('hero_search_started', {
      category: product?.category?.subCategoryId || null,
      search_term: product?.category ? null : product?.text || null,
      location: queryParams.address || null,
      dates: dates || null,
    });

    const to = createResourceLocatorString('SearchPage', routeConfiguration, {}, queryParams);
    history.push(to);
  };

  return (
    <div className={classNames(css.searchBarContainer, css.gridCol3)}>
      <FinalForm
        onSubmit={onSubmit}
        initialValues={initialValues}
        render={({ handleSubmit }) => (
          <Form
            role="search"
            onSubmit={handleSubmit}
            className={classNames(css.gridContainer, css.gridCol3)}
          >
            <div className={css.filterField}>
              <ProductSearchField name="product" alignLeft />
            </div>
            <div className={css.filterField}>
              <FilterLocation setSubmitDisabled={setSubmitDisabled} alignLeft />
            </div>
            <div className={css.filterField}>
              <FilterDateRange config={config} />
            </div>
            <PrimaryButton disabled={submitDisabled} className={css.submitButton} type="submit">
              <FormattedMessage id="UnifiedSearchForm.submit" />
            </PrimaryButton>
          </Form>
        )}
      />
    </div>
  );
};

export default UnifiedSearchForm;
