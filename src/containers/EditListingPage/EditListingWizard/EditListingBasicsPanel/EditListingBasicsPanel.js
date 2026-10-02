import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT } from '../../../../util/types';
import { LISTING_PAGE_PARAM_TYPE_NEW } from '../../../../util/urlHelpers';
import { pickCategoryFields } from '../../../../util/fieldHelpers';

import { H3, ListingLink } from '../../../../components';

import EditListingBasicsForm from './EditListingBasicsForm';
import css from './EditListingBasicsPanel.module.css';

// Same listing-type resolution as EditListingDetailsPanel.js's
// getTransactionInfo/hasSetListingType - duplicated (see the comment in
// EditListingBasicsForm.js for why), trimmed to just what this step needs.
const getTransactionInfo = props => {
  const {
    listingTypes = [],
    existingListingTypeInfo = {},
    includeLabel = false,
    preselectedListingType = null,
  } = props;
  const { listingType, transactionProcessAlias, unitType } = existingListingTypeInfo;

  if (listingType && transactionProcessAlias && unitType) {
    return { listingType, transactionProcessAlias, unitType };
  } else if (listingTypes.length === 1 || preselectedListingType) {
    const listingTypeConfig =
      listingTypes.length === 1
        ? listingTypes[0]
        : preselectedListingType
        ? listingTypes.find(conf => conf.listingType === preselectedListingType)
        : {};
    const { listingType: type, label, transactionType } = listingTypeConfig || {};
    if (!type) {
      return {};
    }
    const { alias, unitType: configUnitType } = transactionType;
    const labelMaybe = includeLabel ? { label: label || type } : {};
    return {
      listingType: type,
      transactionProcessAlias: alias,
      unitType: configUnitType,
      ...labelMaybe,
    };
  }
  return {};
};

const hasSetListingType = publicData => {
  const { listingType, transactionProcessAlias, unitType } = publicData;
  const existingListingTypeInfo = { listingType, transactionProcessAlias, unitType };
  return {
    hasExistingListingType: !!listingType && !!transactionProcessAlias && !!unitType,
    existingListingTypeInfo,
  };
};

// Note: "images" is deliberately left out of this initialValues object - see
// the comment on the "images" prop passed to EditListingBasicsForm below for
// why it's synced separately instead of through FinalForm's own
// initialValues/reinitialize cycle.
const getInitialValues = (props, existingListingTypeInfo, listingTypes, listingCategories, categoryKey) => {
  const { title: existingTitle, publicData } = props?.listing?.attributes || {};
  // Same mechanism as the listingType preselection just below: a brand new
  // draft has no title yet, so a `?title=...` query param (e.g. from the
  // landing page's "Ik wil verhuren" quick-start prompt) can seed one. Once
  // the listing actually has its own title, that always wins.
  const title = existingTitle || props.locationSearch?.title || undefined;
  const preselectedListingType = props.locationSearch?.listingType;
  const listingType = publicData?.listingType || preselectedListingType;

  const nestedCategories = pickCategoryFields(publicData, categoryKey, 1, listingCategories);
  const smartTags = publicData?.smartTags || [];

  return {
    title,
    smartTags,
    ...nestedCategories,
    ...getTransactionInfo({ listingTypes, existingListingTypeInfo, preselectedListingType }),
  };
};

/**
 * Stap 1 ("Basis & Foto's") van de listing-wizard - zie EditListingWizard.js
 * (BASICS tab, default-booking process) en het plan in
 * .claude/plans/sparkling-pondering-spark.md.
 *
 * @component
 * @param {Object} props
 * @returns {JSX.Element}
 */
const EditListingBasicsPanel = props => {
  const {
    className,
    rootClassName,
    params: pathParams,
    locationSearch,
    listing,
    disabled,
    ready,
    onSubmit,
    onListingTypeChange,
    onImageUpload,
    onRemoveImage,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    config,
    listingImageConfig,
    updatePageTitle: UpdatePageTitle,
    intl,
    onManageDisableScrolling,
    isAuthenticated,
    onSignup,
    onLogin,
    signupInProgress,
    signupError,
    loginInProgress,
    loginError,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const { publicData, state } = listing?.attributes || {};
  const listingTypes = config.listing.listingTypes;
  const listingCategories = config.categoryConfiguration.categories;
  const categoryKey = config.categoryConfiguration.key;

  const { hasExistingListingType, existingListingTypeInfo } = hasSetListingType(publicData || {});

  const validPreselectedListingType =
    pathParams?.type === LISTING_PAGE_PARAM_TYPE_NEW && !!locationSearch?.listingType
      ? listingTypes.find(conf => conf.listingType === locationSearch.listingType)
      : null;

  const initialValues = getInitialValues(
    props,
    existingListingTypeInfo,
    listingTypes,
    listingCategories,
    categoryKey
  );

  const isPublished = listing?.id && state !== LISTING_STATE_DRAFT;
  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingBasicsPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingBasicsPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage({ id: panelHeadingProps.id }, { ...panelHeadingProps.messageProps })}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>

      <EditListingBasicsForm
        className={css.form}
        initialValues={initialValues}
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        fetchErrors={errors}
        onImageUpload={onImageUpload}
        onRemoveImage={onRemoveImage}
        listingImageConfig={listingImageConfig}
        // Passed separately from initialValues (which uses
        // keepDirtyOnReinitialize so title/type/category survive unrelated
        // re-renders - see EditListingBasicsForm.js). If "images" were part
        // of that same initialValues object, the very first manual photo
        // reorder/removal (a local-only form mutation) would permanently
        // mark it "dirty", and every later upload would then be silently
        // dropped instead of merged in. EditListingBasicsForm.js instead
        // reconciles this live prop into the images field array directly via
        // form mutators, decoupled from the reinitialize cycle entirely.
        images={props.images}
        onSubmit={values => {
          const { title, images, smartTags, listingType, transactionProcessAlias, unitType, addImage, ...rest } =
            values;

          const nestedCategories = pickCategoryFields(rest, categoryKey, 1, listingCategories);
          const cleanedNestedCategories = {
            ...[1, 2, 3].reduce((a, i) => ({ ...a, [`${categoryKey}${i}`]: null }), {}),
            ...nestedCategories,
          };

          const updateValues = {
            title: title.trim(),
            images,
            publicData: {
              listingType,
              transactionProcessAlias,
              unitType,
              ...cleanedNestedCategories,
              smartTags: smartTags || [],
            },
          };

          onSubmit(updateValues);
        }}
        selectableListingTypes={listingTypes.map(conf =>
          getTransactionInfo({ listingTypes: [conf], existingListingTypeInfo: {}, includeLabel: true })
        )}
        hasPredefinedListingType={hasExistingListingType || !!validPreselectedListingType}
        selectableCategories={listingCategories}
        categoryPrefix={categoryKey}
        onListingTypeChange={onListingTypeChange}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        intl={intl}
        onManageDisableScrolling={onManageDisableScrolling}
        isAuthenticated={isAuthenticated}
        onSignup={onSignup}
        onLogin={onLogin}
        signupInProgress={signupInProgress}
        signupError={signupError}
        loginInProgress={loginInProgress}
        loginError={loginError}
      />
    </main>
  );
};

export default EditListingBasicsPanel;
