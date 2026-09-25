import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeShift } from '../lib/sell/shift-report.ts';

test('closing report reconciles cash after refunds and keeps other payment methods separate', () => {
  const report = summarizeShift(
    [{ subtotal: 100, discount: 0, tax: 15, total: 115 }],
    [{ payment_method: 'cash', amount: 40 }, { payment_method: 'mada', amount: 75 }],
    [{ payment_method: 'cash', amount: 10 }], 50, 78,
  );
  assert.equal(report.expected_cash, 80);
  assert.equal(report.variance, -2);
  assert.deepEqual(report.payments, { cash: 30, mada: 75 });
  assert.equal(report.refunds, 10);
  assert.equal(report.gross_sales, 115);
});
