import { useEffect } from 'react';
import { connect } from 'react-redux';
import { getTransactionsThunk } from '../../store/slices/transactionsSlice';

function TransactionsPage ({ getTransactions, transactions }) {
  useEffect(() => {
    getTransactions();
  });

  const total = transactions.reduce((accum, t) => accum + t.amount, 0);

  return (
    <>
      <h2>Your Transactions</h2>
      <table>
        <caption>Transactions</caption>
        <thead>
          <tr>
            <th key={1}>#</th>
            <th key={2}>Amount</th>
            <th key={3}>Type</th>
            <th key={4}>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={t.id}>
              <td key={1}>{i + 1}</td>
              <td key={2}>{t.amount}</td>
              <td key={3}>{t.operationType}</td>
              <td key={4}>{t.createdAt}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th>Total:</th>
            <td colSpan={3}>{total}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}

const mapStateToProps = state => state.transactionsStore;

const mapDispatchToProps = dispatch => ({
  getTransactions: () => dispatch(getTransactionsThunk()),
});

export default connect(mapStateToProps, mapDispatchToProps)(TransactionsPage);
