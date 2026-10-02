import React, { useState, useEffect, useRef } from 'react';
import { ARRAY_ERROR } from 'final-form';
import { Field, Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FieldArray } from 'react-final-form-arrays';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { nonEmptyArray, composeValidators, maxLength, required } from '../../../../util/validators';
import { isUploadImageOverLimitError } from '../../../../util/errors';

import {
  Form,
  Button,
  AspectRatioWrapper,
  FieldSelect,
  FieldTextInput,
  FieldCheckbox,
  Heading,
} from '../../../../components';

import ListingImage from '../EditListingPhotosPanel/ListingImage';
import { suggestCategoryFromTitle } from '../EditListingDetailsPanel/categorySuggestion';
import { tagOptionsForCategory } from './categoryTags';
import { compressImage } from './compressImage';
import CompleteAccountModal from './CompleteAccountModal';
import css from './EditListingBasicsForm.module.css';

// Matches the ".JPG of .PNG" copy shown under the upload button - AVIF/WebP/
// HEIC and other formats browsers vary wildly in support for get rejected
// here instead of silently hanging: canvas-based decoding in compressImage.js
// can leave an <img> neither firing onload nor onerror for a format the
// browser can't handle, which previously left the upload stuck "loading"
// forever (state.imageUploadRequested never reset).
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const ACCEPT_IMAGES = ACCEPTED_IMAGE_TYPES.join(',');
const TITLE_MAX_LENGTH = 60;
const MIN_RECOMMENDED_PHOTOS = 3;
const CATEGORY_SUGGESTION_DEBOUNCE_MS = 500;

const ImageUploadError = props => {
  return props.invalidFileType ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingBasicsForm.imageUploadFailed.invalidFileType" />
    </p>
  ) : props.uploadOverLimit ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingBasicsForm.imageUploadFailed.uploadOverLimit" />
    </p>
  ) : props.uploadImageError ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingBasicsForm.imageUploadFailed.uploadFailed" />
    </p>
  ) : null;
};

// Field component that uses file-input to allow user to select images.
const FieldAddImage = props => {
  const { formApi, onImageUploadHandler, aspectWidth = 1, aspectHeight = 1, ...rest } = props;
  return (
    <Field form={null} {...rest}>
      {fieldprops => {
        const { accept, input, label, disabled: fieldDisabled } = fieldprops;
        const { name, type } = input;
        const onChange = e => {
          const file = e.target.files[0];
          formApi.change(`addImage`, file);
          formApi.blur(`addImage`);
          onImageUploadHandler(file, formApi);
        };
        const inputProps = { accept, id: name, name, onChange, type };
        return (
          <div className={css.addImageWrapper}>
            <AspectRatioWrapper width={aspectWidth} height={aspectHeight}>
              {fieldDisabled ? null : <input {...inputProps} className={css.addImageInput} />}
              <label htmlFor={name} className={css.addImage}>
                {label}
              </label>
            </AspectRatioWrapper>
          </div>
        );
      }}
    </Field>
  );
};

// One image thumbnail, with up/down buttons to reorder (no drag-and-drop
// library is installed in this project - fields.swap() from
// final-form-arrays gives the same end result with plain buttons).
const FieldListingImage = props => {
  const {
    name,
    index,
    lastIndex,
    intl,
    onRemoveImage,
    onMoveUp,
    onMoveDown,
    aspectWidth,
    aspectHeight,
    variantPrefix,
  } = props;
  return (
    <Field name={name}>
      {fieldProps => {
        const { input } = fieldProps;
        const image = input.value;
        return image ? (
          <div className={css.imageTile}>
            {index === 0 ? (
              <span className={css.coverBadge}>
                <FormattedMessage id="EditListingBasicsForm.coverImageBadge" />
              </span>
            ) : null}
            <ListingImage
              image={image}
              key={image?.id?.uuid || image?.id}
              className={css.thumbnail}
              savedImageAltText={intl.formatMessage({
                id: 'EditListingBasicsForm.savedImageAltText',
              })}
              onRemoveImage={() => onRemoveImage(image?.id)}
              aspectWidth={aspectWidth}
              aspectHeight={aspectHeight}
              variantPrefix={variantPrefix}
            />
            <div className={css.reorderButtons}>
              <button
                type="button"
                className={css.reorderButton}
                onClick={onMoveUp}
                disabled={index === 0}
                aria-label={intl.formatMessage({ id: 'EditListingBasicsForm.moveImageUp' })}
              >
                ↑
              </button>
              <button
                type="button"
                className={css.reorderButton}
                onClick={onMoveDown}
                disabled={index === lastIndex}
                aria-label={intl.formatMessage({ id: 'EditListingBasicsForm.moveImageDown' })}
              >
                ↓
              </button>
            </div>
          </div>
        ) : null;
      }}
    </Field>
  );
};

// Hidden input field, same helper as EditListingDetailsForm.js's.
const FieldHidden = props => {
  const { name } = props;
  return (
    <Field id={name} name={name} type="hidden" className={css.unitTypeHidden}>
      {fieldRenderProps => <input {...fieldRenderProps?.input} />}
    </Field>
  );
};

// listingType/transactionProcessAlias/unitType selection, duplicated from
// EditListingDetailsForm.js (same convention as EditListingPricingAndStockPanel
// vs EditListingPricingPanel: duplicated, not shared, to avoid coupling this
// new step to the old Details form's internals). OmniRent only has one
// listing type configured today, so this renders as hidden fields in
// practice, but stays correct if more listing types get added later.
const FieldSelectListingType = props => {
  const { name, listingTypes, hasPredefinedListingType, onListingTypeChange, formApi, formId, intl } =
    props;
  const hasMultipleListingTypes = listingTypes?.length > 1;

  const handleOnChange = value => {
    const selectedListingType = listingTypes.find(config => config.listingType === value);
    formApi.change('transactionProcessAlias', selectedListingType.transactionProcessAlias);
    formApi.change('unitType', selectedListingType.unitType);
    if (onListingTypeChange) {
      onListingTypeChange(selectedListingType);
    }
  };
  const getListingTypeLabel = listingType => {
    const listingTypeConfig = listingTypes.find(config => config.listingType === listingType);
    return listingTypeConfig ? listingTypeConfig.label : listingType;
  };

  return hasMultipleListingTypes && !hasPredefinedListingType ? (
    <>
      <FieldSelect
        id={formId ? `${formId}.${name}` : name}
        name={name}
        className={css.listingTypeSelect}
        label={intl.formatMessage({ id: 'EditListingBasicsForm.listingTypeLabel' })}
        validate={required(
          intl.formatMessage({ id: 'EditListingBasicsForm.listingTypeRequired' })
        )}
        onChange={handleOnChange}
      >
        <option disabled value="">
          {intl.formatMessage({ id: 'EditListingBasicsForm.listingTypePlaceholder' })}
        </option>
        {listingTypes.map(config => (
          <option key={config.listingType} value={config.listingType}>
            {config.label}
          </option>
        ))}
      </FieldSelect>
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </>
  ) : hasMultipleListingTypes && hasPredefinedListingType ? (
    <div className={css.listingTypeSelect}>
      <Heading as="h5" rootClassName={css.selectedLabel}>
        {intl.formatMessage({ id: 'EditListingBasicsForm.listingTypeLabel' })}
      </Heading>
      <p className={css.selectedValue}>{getListingTypeLabel(formApi.getFieldState(name)?.value)}</p>
      <FieldHidden name={name} />
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </div>
  ) : (
    <>
      <FieldHidden name={name} />
      <FieldHidden name="transactionProcessAlias" />
      <FieldHidden name="unitType" />
    </>
  );
};

// Finds the correct subcategory within the given categories array based on the provided categoryIdToFind.
const findCategoryConfig = (categories, categoryIdToFind) => {
  return categories?.find(category => category.id === categoryIdToFind);
};

// Same nested category-select pattern as EditListingDetailsForm.js's
// CategoryField/FieldSelectCategory - duplicated rather than shared, same
// convention already used elsewhere in this wizard (e.g.
// EditListingPricingAndStockPanel vs EditListingPricingPanel).
const CategoryField = props => {
  const { currentCategoryOptions, level, values, prefix, handleCategoryChange, intl } = props;
  const currentCategoryKey = `${prefix}${level}`;
  const categoryConfig = findCategoryConfig(currentCategoryOptions, values[`${prefix}${level}`]);

  return (
    <>
      {currentCategoryOptions ? (
        <FieldSelect
          key={currentCategoryKey}
          id={currentCategoryKey}
          name={currentCategoryKey}
          className={css.listingTypeSelect}
          onChange={event => handleCategoryChange(event, level, currentCategoryOptions)}
          label={intl.formatMessage(
            { id: 'EditListingBasicsForm.categoryLabel' },
            { categoryLevel: currentCategoryKey }
          )}
          validate={required(
            intl.formatMessage(
              { id: 'EditListingBasicsForm.categoryRequired' },
              { categoryLevel: currentCategoryKey }
            )
          )}
        >
          <option disabled value="">
            {intl.formatMessage(
              { id: 'EditListingBasicsForm.categoryPlaceholder' },
              { categoryLevel: currentCategoryKey }
            )}
          </option>
          {currentCategoryOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </FieldSelect>
      ) : null}

      {categoryConfig?.subcategories?.length > 0 ? (
        <CategoryField
          currentCategoryOptions={categoryConfig.subcategories}
          level={level + 1}
          values={values}
          prefix={prefix}
          handleCategoryChange={handleCategoryChange}
          intl={intl}
        />
      ) : null}
    </>
  );
};

const FieldSelectCategory = props => {
  useEffect(() => {
    checkIfInitialValuesExist();
  }, []);

  const {
    prefix,
    listingCategories,
    formApi,
    intl,
    setAllCategoriesChosen,
    values,
    onManualChange,
  } = props;

  const countSelectedCategories = () => {
    return Object.keys(values).filter(key => key.startsWith(prefix)).length;
  };

  const checkIfInitialValuesExist = () => {
    const count = countSelectedCategories(values, prefix);
    setAllCategoriesChosen(count > 0);
  };

  const handleCategoryChange = (category, level, currentCategoryOptions) => {
    const selectedCatLenght = countSelectedCategories();
    if (level < selectedCatLenght) {
      for (let i = selectedCatLenght; i > level; i--) {
        formApi.change(`${prefix}${i}`, null);
      }
    }
    const categoryConfig = findCategoryConfig(currentCategoryOptions, category).subcategories;
    setAllCategoriesChosen(!categoryConfig || categoryConfig.length === 0);
    if (onManualChange) {
      onManualChange();
    }
  };

  return (
    <CategoryField
      currentCategoryOptions={listingCategories}
      level={1}
      values={values}
      prefix={prefix}
      handleCategoryChange={handleCategoryChange}
      intl={intl}
    />
  );
};

/**
 * Stap 1 van de listing-wizard: foto's, titel, categorie (met
 * titel-gebaseerde auto-suggestie, zie categorySuggestion.js) en slimme
 * tags. Dit wordt de tab die de listing-draft aanmaakt (vervangt de oude,
 * losse Details- en Photos-tabs voor het default-booking-proces - zie
 * EditListingWizard.js).
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {boolean} props.disabled
 * @param {boolean} props.ready
 * @param {boolean} props.updated
 * @param {boolean} props.updateInProgress
 * @param {Object} props.fetchErrors
 * @param {string} props.saveActionMsg
 * @param {Function} props.onSubmit
 * @param {Function} props.onImageUpload
 * @param {Function} props.onRemoveImage
 * @param {Object} props.listingImageConfig
 * @param {Array<Object>} props.selectableCategories
 * @param {string} props.categoryPrefix
 * @returns {JSX.Element}
 */
export const EditListingBasicsForm = props => {
  const [state, setState] = useState({ imageUploadRequested: false });
  const [submittedImages, setSubmittedImages] = useState([]);
  const [allCategoriesChosen, setAllCategoriesChosen] = useState(false);
  const [categoryManuallyChanged, setCategoryManuallyChanged] = useState(false);
  const [categoryAutoSuggested, setCategoryAutoSuggested] = useState(false);
  // "List First, Sign Up Later" (see CompleteAccountModal.js): an
  // anonymous provider can fill in this whole step, including photos,
  // before an account exists. showCompleteAccountModal opens on submit;
  // continuingAfterAuth covers the short window right after signup/login
  // succeeds, while the buffered photos are actually being uploaded for
  // real before the draft gets created.
  const [showCompleteAccountModal, setShowCompleteAccountModal] = useState(false);
  const [continuingAfterAuth, setContinuingAfterAuth] = useState(false);
  const [invalidFileType, setInvalidFileType] = useState(false);

  const onImageUploadHandler = (file, formApi) => {
    const { listingImageConfig, onImageUpload, isAuthenticated } = props;
    if (!file) {
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      // Reject up front instead of handing it to compressImage: canvas
      // decoding an unsupported format (e.g. AVIF/HEIC in browsers that
      // don't handle it) can leave the <img> never firing onload or
      // onerror, which otherwise left the upload stuck "loading" forever.
      setInvalidFileType(true);
      return;
    }
    setInvalidFileType(false);
    setState({ imageUploadRequested: true });
    const id = `${file.name}_${Date.now()}`;
    // Compressed client-side (max 1600px, JPEG, target <=2MB) before it
    // ever leaves the device - most phone photos are far wider/heavier
    // than anything the listing UI displays. Falls back to the original
    // file on any failure (see compressImage.js), so this never blocks
    // an upload.
    compressImage(file).then(compressedFile => {
      if (isAuthenticated) {
        onImageUpload({ id, file: compressedFile }, listingImageConfig)
          .then(() => setState({ imageUploadRequested: false }))
          .catch(() => setState({ imageUploadRequested: false }));
      } else {
        // No account yet, so there's nothing to attach a real Sharetribe
        // image to. Push the same {id, file} shape ListingImage.js already
        // renders for an in-flight upload (see FieldListingImage above)
        // straight into the form's own images array - a purely local
        // preview. The real upload happens in handleAccountCompleted below,
        // once signing up/in gives us something to attach it to.
        formApi.mutators.push('images', { id, file: compressedFile });
        setState({ imageUploadRequested: false });
      }
    });
  };

  // Called once CompleteAccountModal reports a successful signup/login.
  // Uploads every still-local {id, file} image for real, patches the
  // now-authenticated Sharetribe image entities into the form in place
  // (same id, so nothing shifts position or duplicates), then lets the
  // already-validated submit through.
  const handleAccountCompleted = formApi => async () => {
    setContinuingAfterAuth(true);
    try {
      const currentImages = formApi.getState().values.images || [];
      const pendingImages = currentImages.filter(img => img?.file && !img?.imageId);
      const uploaded = await Promise.all(
        pendingImages.map(img =>
          props.onImageUpload({ id: img.id, file: img.file }, props.listingImageConfig)
        )
      );
      uploaded.forEach(({ data }) => {
        const idx = formApi
          .getState()
          .values.images.findIndex(img => img.id === data.id);
        if (idx !== -1) {
          formApi.mutators.update('images', idx, data);
        }
      });
      setShowCompleteAccountModal(false);
      formApi.submit();
    } finally {
      setContinuingAfterAuth(false);
    }
  };

  const intl = useIntl();

  return (
    <FinalForm
      {...props}
      mutators={{ ...arrayMutators }}
      keepDirtyOnReinitialize
      render={formRenderProps => {
        const {
          form: formApi,
          className,
          fetchErrors,
          handleSubmit,
          invalid,
          onRemoveImage,
          disabled,
          ready,
          saveActionMsg,
          updated,
          updateInProgress,
          touched,
          errors,
          values,
          listingImageConfig,
          selectableCategories,
          categoryPrefix,
          selectableListingTypes,
          hasPredefinedListingType,
          onListingTypeChange,
          formId,
          onManageDisableScrolling,
          isAuthenticated,
          onSignup,
          onLogin,
          signupInProgress,
          signupError,
          loginInProgress,
          loginError,
        } = formRenderProps;

        const { title } = values;

        useEffect(() => {
          if (categoryManuallyChanged || !title) {
            return undefined;
          }
          const timeoutId = setTimeout(() => {
            const suggestion = suggestCategoryFromTitle(title);
            if (!suggestion) {
              return;
            }
            formApi.change(`${categoryPrefix}1`, suggestion.categoryLevel1);
            formApi.change(`${categoryPrefix}2`, suggestion.categoryLevel2);
            formApi.change(`${categoryPrefix}3`, suggestion.categoryLevel3 || null);
            setAllCategoriesChosen(true);
            setCategoryAutoSuggested(true);
          }, CATEGORY_SUGGESTION_DEBOUNCE_MS);
          return () => clearTimeout(timeoutId);
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [title, categoryManuallyChanged]);

        // Reconciles newly uploaded/updated images (from props.images, which
        // is driven by Redux - see onImageUploadHandler below and the prop
        // comment in EditListingBasicsPanel.js) into the "images" field
        // array via direct mutators, instead of through FinalForm's
        // initialValues/reinitialize cycle. That cycle only has one dirty
        // flag per field: once the user reorders or removes a photo (a
        // local-only mutation, fields.swap/fields.remove below), the whole
        // "images" field would be marked dirty and keepDirtyOnReinitialize
        // would then block every later upload from ever merging in. Pushing/
        // updating by id here instead preserves the user's manual ordering
        // while still always accepting new/updated images.
        //
        // A freshly uploaded image goes through up to three different id
        // shapes over its lifetime, and a form entry pushed at an earlier
        // shape needs to keep matching every later one, or it ends up
        // duplicated instead of updated in place:
        //  1. upload pending:  { id: tempId }                      (just pushed - see below)
        //  2. upload fulfilled: { id: tempId, imageId: realUUID }  (see EditListingPage.duck.js's uploadImageThunk)
        //  3. after the draft is saved: { id: realUUID }           (now sourced from the listing entity itself,
        //                                                            via EditListingPage.js's pickRenderableImages)
        // Matching on a single current id (e.g. "imageId when present, else
        // id") breaks across these transitions: a step-1 entry already
        // sitting in the form only knows tempId, so it won't match a step-2
        // or step-3 propImage even though it's the same photo - each
        // mismatch pushes a second row instead of updating the first,
        // which is the bug where the first photo doubles right after
        // uploading, and again after clicking "Volgende". Comparing the
        // *sets* of ids each side has ever been known by (own id + imageId,
        // unwrapped to plain uuid strings) catches a match at every stage
        // instead of only the current one.
        const idStrings = img =>
          [img?.id, img?.imageId].filter(Boolean).map(v => v?.uuid || v);
        const sameImage = (a, b) => {
          const bIds = idStrings(b);
          return idStrings(a).some(id => bIds.includes(id));
        };
        const prevPropImagesRef = useRef(null);
        useEffect(() => {
          const propImages = props.images || [];
          const prevPropImages = prevPropImagesRef.current;
          prevPropImagesRef.current = propImages;
          if (propImages === prevPropImages) {
            return;
          }
          const currentFormImages = formApi.getState().values.images || [];
          propImages.forEach(propImage => {
            const formIndex = currentFormImages.findIndex(fi => sameImage(fi, propImage));
            if (formIndex === -1) {
              formApi.mutators.push('images', propImage);
            } else if (currentFormImages[formIndex] !== propImage) {
              formApi.mutators.update('images', formIndex, propImage);
            }
          });
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [props.images]);

        const images = values.images || [];
        const lastIndex = images.length - 1;
        const { aspectWidth = 1, aspectHeight = 1, variantPrefix } = listingImageConfig;

        const { updateListingError, uploadImageError } = fetchErrors || {};
        const uploadOverLimit = isUploadImageOverLimitError(uploadImageError);

        const arrayOfImgIds = imgs => imgs?.map(i => (typeof i.id === 'string' ? i.imageId : i.id));
        const imageIdsFromProps = arrayOfImgIds(images);
        const imageIdsFromPreviousSubmit = arrayOfImgIds(submittedImages);
        const imageArrayHasSameImages = isEqual(imageIdsFromProps, imageIdsFromPreviousSubmit);
        const submittedOnce = submittedImages.length > 0;
        const pristineSinceLastSubmit = submittedOnce && imageArrayHasSameImages;

        const submitReady = (updated && pristineSinceLastSubmit) || ready;
        const submitInProgress = updateInProgress;
        const submitDisabled =
          invalid ||
          disabled ||
          submitInProgress ||
          state.imageUploadRequested ||
          continuingAfterAuth ||
          ready ||
          !allCategoriesChosen;
        const imagesError = touched.images && errors?.images && errors.images[ARRAY_ERROR];

        const classes = classNames(css.root, className);

        const selectedCategoryId =
          values[`${categoryPrefix}3`] || values[`${categoryPrefix}2`] || null;
        const tagOptions = tagOptionsForCategory(
          values[`${categoryPrefix}3`],
          values[`${categoryPrefix}2`]
        );

        return (
          <>
          <Form
            className={classes}
            onSubmit={e => {
              // "List First, Sign Up Later": an anonymous visitor can fill
              // in this whole step, but creating the draft needs a real
              // account (Sharetribe has no anonymous-owned listing/image).
              // Hold the submit here and ask for one instead - see
              // handleAccountCompleted above, which resumes this exact
              // submit once signup/login succeeds.
              if (!isAuthenticated) {
                e.preventDefault();
                setShowCompleteAccountModal(true);
                return;
              }
              setSubmittedImages(images);
              handleSubmit(e);
            }}
          >
            {updateListingError ? (
              <p className={css.error}>
                <FormattedMessage id="EditListingBasicsForm.updateFailed" />
              </p>
            ) : null}

            <FieldSelectListingType
              name="listingType"
              listingTypes={selectableListingTypes}
              hasPredefinedListingType={hasPredefinedListingType}
              onListingTypeChange={onListingTypeChange}
              formApi={formApi}
              formId={formId}
              intl={intl}
            />

            <div className={css.sectionContainer}>
              <h3 className={css.sectionTitle}>
                <FormattedMessage id="EditListingBasicsForm.titleHeading" />
              </h3>
              <FieldTextInput
                id="title"
                name="title"
                className={css.title}
                type="text"
                label={intl.formatMessage({ id: 'EditListingBasicsForm.title' })}
                placeholder={intl.formatMessage({ id: 'EditListingBasicsForm.titlePlaceholder' })}
                maxLength={TITLE_MAX_LENGTH}
                validate={composeValidators(
                  required(intl.formatMessage({ id: 'EditListingBasicsForm.titleRequired' })),
                  maxLength(
                    intl.formatMessage(
                      { id: 'EditListingBasicsForm.maxLength' },
                      { maxLength: TITLE_MAX_LENGTH }
                    ),
                    TITLE_MAX_LENGTH
                  )
                )}
              />

              <FieldSelectCategory
                values={values}
                prefix={categoryPrefix}
                listingCategories={selectableCategories}
                formApi={formApi}
                intl={intl}
                allCategoriesChosen={allCategoriesChosen}
                setAllCategoriesChosen={setAllCategoriesChosen}
                onManualChange={() => setCategoryManuallyChanged(true)}
              />
              {categoryAutoSuggested && !categoryManuallyChanged ? (
                <p className={css.categorySuggestionHint}>
                  <FormattedMessage id="EditListingBasicsForm.categorySuggested" />
                </p>
              ) : null}
            </div>

            {allCategoriesChosen && tagOptions.length > 0 ? (
              <div className={css.sectionContainer}>
                <h3 className={css.sectionTitle}>
                  <FormattedMessage id="EditListingBasicsForm.tagsHeading" />
                </h3>
                <div className={css.tagsGrid}>
                  {tagOptions.map(tagId => (
                    <FieldCheckbox
                      key={tagId}
                      id={`smartTags-${tagId}`}
                      name="smartTags"
                      className={css.tagCheckbox}
                      value={tagId}
                      label={intl.formatMessage({ id: `EditListingBasicsForm.tag.${tagId}` })}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className={css.sectionContainer}>
              <h3 className={css.sectionTitle}>
                <FormattedMessage id="EditListingBasicsForm.photosHeading" />
              </h3>
              <div className={css.imagesFieldArray}>
                <FieldArray
                  name="images"
                  validate={composeValidators(
                    nonEmptyArray(
                      intl.formatMessage({ id: 'EditListingBasicsForm.imageRequired' })
                    )
                  )}
                >
                  {({ fields }) =>
                    fields.map((name, index) => (
                      <FieldListingImage
                        key={name}
                        name={name}
                        index={index}
                        lastIndex={lastIndex}
                        onRemoveImage={imageId => {
                          fields.remove(index);
                          onRemoveImage(imageId);
                        }}
                        onMoveUp={() => fields.swap(index, index - 1)}
                        onMoveDown={() => fields.swap(index, index + 1)}
                        intl={intl}
                        aspectWidth={aspectWidth}
                        aspectHeight={aspectHeight}
                        variantPrefix={variantPrefix}
                      />
                    ))
                  }
                </FieldArray>

                <FieldAddImage
                  id="addImage"
                  name="addImage"
                  accept={ACCEPT_IMAGES}
                  label={
                    <span className={css.chooseImageText}>
                      <span className={css.chooseImage}>
                        <FormattedMessage id="EditListingBasicsForm.chooseImage" />
                      </span>
                      <span className={css.imageTypes}>
                        <FormattedMessage id="EditListingBasicsForm.imageTypes" />
                      </span>
                    </span>
                  }
                  type="file"
                  disabled={state.imageUploadRequested}
                  formApi={formApi}
                  onImageUploadHandler={onImageUploadHandler}
                  aspectWidth={aspectWidth}
                  aspectHeight={aspectHeight}
                />
              </div>

              {imagesError ? <div className={css.arrayError}>{imagesError}</div> : null}
              <ImageUploadError
                invalidFileType={invalidFileType}
                uploadOverLimit={uploadOverLimit}
                uploadImageError={uploadImageError}
              />

              {images.length < MIN_RECOMMENDED_PHOTOS ? (
                <p className={css.photoCountHint}>
                  <FormattedMessage id="EditListingBasicsForm.photoCountHint" />
                </p>
              ) : null}
              <p className={css.tip}>
                <FormattedMessage id="EditListingBasicsForm.addImagesTip" />
              </p>
            </div>

            <div className={css.submitSection}>
              <Button
                className={css.submitButton}
                type="submit"
                inProgress={submitInProgress || continuingAfterAuth}
                disabled={submitDisabled}
                ready={submitReady}
              >
                {isAuthenticated ? (
                  saveActionMsg
                ) : (
                  <FormattedMessage id="EditListingBasicsForm.saveAndCreateAccount" />
                )}
              </Button>
            </div>
          </Form>

            <CompleteAccountModal
              isOpen={showCompleteAccountModal}
              onClose={() => setShowCompleteAccountModal(false)}
              onManageDisableScrolling={onManageDisableScrolling}
              isAuthenticated={isAuthenticated}
              onSignup={onSignup}
              onLogin={onLogin}
              signupInProgress={signupInProgress}
              signupError={signupError}
              loginInProgress={loginInProgress}
              loginError={loginError}
              onAuthenticated={handleAccountCompleted(formApi)}
            />
          </>
        );
      }}
    />
  );
};

export default EditListingBasicsForm;
