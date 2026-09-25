# AVERO Operations and Sell — gap audit (25 September 2026)

This is a code and India schema audit, not a claim of end-to-end acceptance by a restaurant. No production order, payment or stock transaction was created for this audit.

| Domain | Evidence in current product | Status and remaining acceptance work |
| --- | --- | --- |
| Sell: Cashier | Products/categories, open/close shift, hold, checkout and receipt UI; `sales_checkout` database function posts stock and accounting in one transaction | Functional foundation. Test a real order, tax-inclusive pricing, payment adjustments, refund and shift reconciliation with a controlled company. |
| Sell: payments and refunds | Payment methods and full-order refund function; checkout API accepts the first payment only | Partial. Split tender, partial refunds, gateway confirmation and idempotent retries need design and tests. Do not present a selected card method as proof of external settlement. |
| Sell: tables/KDS/loyalty | Tables and order tracking statuses exist | Partial. No dedicated kitchen display lifecycle or loyalty ledger was found. |
| Operations: inventory | Items, warehouses, balances, counts, moves, reservations and waste routes | Broad foundation. Review every privileged write for tenant-owned related IDs, negative stock and accounting reconciliation. |
| Operations: purchasing | Request, RFQ, quotes, approval, PO, receipt, invoice, match, payment and supplier return actions | Broad foundation. Run controlled request → receipt → payable acceptance tests; confirm taxes and amounts cannot be supplied inconsistently by clients. |
| Operations: recipes/production | Recipes, versions, orders, consumption, waste and completion RPC | Broad foundation. Validate recipe cost/yield and stock consumption in a controlled test, including failure rollback. |
| Operations: accounting | Accounts, journal entries and lines with a read-only API | Partial. No expense, period close, full financial statements or reconciliation workflow in this interface; displayed balances currently sum only the latest 1,000 fetched lines, so they cannot be called an all-time trial balance. |
| Operations: HR/assets/maintenance | Biometric registration and hiring tables exist outside the Operations area | Incomplete. Attendance/payroll, assets and maintenance operations are not implemented as an ERP cycle. |

## Security and correctness changes in this slice

- Sales and Cashier configuration APIs now require a Sell subscription on the server. The Add Items page and Product Master read require product management permission, including a direct URL visit.
- The broad commerce administration read requires `sales.manage`; a user with invoice customization alone receives only the invoice template.
- Sales orders returned to roles without cost permission exclude internal order and line costs, while keeping sell amounts available.

## Next delivery order

1. Make checkout retry-safe and test payment totals, tax and stock/accounting posting together. Split payments and gateway callbacks need separate transaction design.
2. Fix accounting balance aggregation over the full ledger, define posted/reversed semantics and add a trial balance reconciliation check.
3. Complete inventory and purchasing tenant integrity at the database boundary and acceptance-test a full purchase to sale cycle.
4. Add requested HR/expenses/assets/maintenance features as separate Operations use cases, with module permissions and audit events.

Each acceptance flow must run in a controlled India tenant and verify tenant separation before describing the module as complete.
