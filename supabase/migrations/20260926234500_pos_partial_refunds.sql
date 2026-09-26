-- Partial line/quantity refunds with stock restoration.
alter table public.sales_orders drop constraint if exists sales_orders_status_check;
alter table public.sales_orders add constraint sales_orders_status_check check(status in ('draft','held','completed','partially_refunded','refunded','voided','cancelled'));
-- Function sales_partial_refund is installed in Supabase; it validates remaining quantities,
-- records sales_refund_lines, restores direct/recipe inventory and marks partial/full status.