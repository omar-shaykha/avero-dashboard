export type LedgerLine = { account_id: string; debit: number | string | null; credit: number | string | null };

/** Sum each page into the same accumulator so report balances include the entire ledger. */
export function addLedgerBalances(totals: Map<string, number>, lines: LedgerLine[]): void {
  for (const line of lines) {
    totals.set(line.account_id, (totals.get(line.account_id) || 0) + Number(line.debit || 0) - Number(line.credit || 0));
  }
}
