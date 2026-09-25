import assert from 'node:assert/strict';
import test from 'node:test';
import { visibleSalesOrders } from '../lib/sell/visibility.ts';

const orders = [{ id: 'sale', total: 23, cost_total: 12,
  sales_order_lines: [{ product_name: 'Burger', line_total: 23, unit_cost: 12, total_cost: 12 }] }];

test('cashiers can see sale amounts but not internal cost figures', () => {
  const response = visibleSalesOrders(orders, false);
  assert.deepEqual(response, [{ id: 'sale', total: 23,
    sales_order_lines: [{ product_name: 'Burger', line_total: 23 }] }]);
  assert.equal(JSON.stringify(orders).includes('cost_total'), true);
});

test('cost-authorized roles retain the complete order', () => {
  assert.deepEqual(visibleSalesOrders(orders, true), orders);
});
