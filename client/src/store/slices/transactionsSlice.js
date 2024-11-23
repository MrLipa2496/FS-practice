import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as restController from '../../api/rest/restController';

const TRANSACTIONS_SLICE_NAME = 'transactions';

const initialState = {
  transactions: [],
  isFetching: true,
  error: null,
};

// /transactions/get
export const getTransactionsThunk = createAsyncThunk(
  `${TRANSACTIONS_SLICE_NAME}/get`,
  async (payload, { rejectWithValue }) => {
    try {
      const transactions = await restController.getTransactions();
      console.log(transactions);
      return transactions;
    } catch (err) {
      return rejectWithValue(err);
    }
  }
);
const transactionsSlice = createSlice({
  name: TRANSACTIONS_SLICE_NAME,
  initialState,
  reducers: {},
});

const { reducer, actions } = transactionsSlice;

export default reducer;
