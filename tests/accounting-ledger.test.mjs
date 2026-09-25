import assert from 'node:assert/strict';
import test from 'node:test';
import { addLedgerBalances } from '../lib/accounting/ledger.ts';

test('balance includes all pages beyond the database row limit', () => {
  const totals = new Map();
  addLedgerBalances(totals, Array.from({ length: 1000 }, () => ({ account_id: 'revenue', debit: 0, credit: 1 })));
  addLedgerBalances(totals, [{ account_id: 'revenue', debit: 200, credit: 0 }, { account_id: 'cash', debit: '800', credit: null }]);
  assert.equal(totals.get('revenue'), -800);
  assert.equal(totals.get('cash'), 800);
});
