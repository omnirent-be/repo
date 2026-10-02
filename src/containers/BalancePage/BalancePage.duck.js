import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { getSupportedProcessesInfo } from '../../transactions/transaction';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

// Sharetribe API max page size. A provider's full sales history rarely
// exceeds this for now; pagination can be added later if needed.
const BALANCE_PAGE_SIZE = 100;

// ================ Async Thunks ================ //

const queryEarningsPayloadCreator = (_, { dispatch, rejectWithValue, extra: sdk }) => {
  const processNames = getSupportedProcessesInfo().map(p => p.name);

  const apiQueryParams = {
    only: 'sale',
    processNames,
    include: ['listing'],
    'fields.transaction': [
      'processName',
      'lastTransition',
      'lastTransitionedAt',
      'payinTotal',
      'payoutTotal',
    ],
    'fields.listing': ['title'],
    page: 1,
    perPage: BALANCE_PAGE_SIZE,
  };

  return sdk.transactions
    .query(apiQueryParams)
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      return response;
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const queryEarningsThunk = createAsyncThunk(
  'app/BalancePage/queryEarnings',
  queryEarningsPayloadCreator
);

// ================ Slice ================ //

const entityRefs = entities => entities.map(entity => ({ id: entity.id, type: entity.type }));

const balancePageSlice = createSlice({
  name: 'BalancePage',
  initialState: {
    transactionRefs: [],
    pagination: null,
    queryInProgress: false,
    queryEarningsError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(queryEarningsThunk.pending, state => {
        state.queryInProgress = true;
        state.queryEarningsError = null;
      })
      .addCase(queryEarningsThunk.fulfilled, (state, action) => {
        state.transactionRefs = entityRefs(action.payload.data.data);
        state.pagination = action.payload.data.meta;
        state.queryInProgress = false;
      })
      .addCase(queryEarningsThunk.rejected, (state, action) => {
        console.error(action.payload || action.error);
        state.queryInProgress = false;
        state.queryEarningsError = action.payload;
      });
  },
});

export default balancePageSlice.reducer;

// ================ Load data ================ //

export const loadData = () => (dispatch, getState, sdk) => {
  return dispatch(queryEarningsThunk());
};
