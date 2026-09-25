type Order = { subtotal: number | string | null; discount: number | string | null; tax: number | string | null; total: number | string | null };
type MoneyMovement = { payment_method: string | null; amount: number | string | null };

export function summarizeShift(orders: Order[], payments: MoneyMovement[], refunds: MoneyMovement[], openingCash: number, countedCash: number) {
  const byMethod: Record<string, number> = {};
  for (const movement of payments) {
    const method = String(movement.payment_method || "other").toLowerCase();
    byMethod[method] = (byMethod[method] || 0) + Number(movement.amount || 0);
  }
  for (const movement of refunds) {
    const method = String(movement.payment_method || "other").toLowerCase();
    byMethod[method] = (byMethod[method] || 0) - Number(movement.amount || 0);
  }
  const total = (key: keyof Order) => orders.reduce((sum, order) => sum + Number(order[key] || 0), 0);
  const expectedCash = openingCash + (byMethod.cash || 0);
  return {
    orders: orders.length,
    subtotal: total("subtotal"), discount: total("discount"), tax: total("tax"),
    gross_sales: total("total"),
    refunds: refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0),
    payments: byMethod, opening_cash: openingCash, expected_cash: expectedCash,
    closing_cash: countedCash, variance: countedCash - expectedCash,
  };
}
