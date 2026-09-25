/** Remove internal cost figures from sales responses for roles without cost access. */
export function visibleSalesOrders<T extends { cost_total?: unknown; sales_order_lines?: Array<{ unit_cost?: unknown; total_cost?: unknown }> }>(
  orders: T[], canViewCost: boolean,
): T[] {
  if (canViewCost) return orders;
  return orders.map(({ cost_total: _cost, sales_order_lines, ...order }) => ({
    ...order,
    sales_order_lines: sales_order_lines?.map(({ unit_cost: _unit, total_cost: _total, ...line }) => line),
  }) as T);
}
