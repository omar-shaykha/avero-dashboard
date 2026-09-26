alter table public.sales_orders add column if not exists kitchen_started_at timestamptz;
alter table public.sales_orders add column if not exists kitchen_ready_at timestamptz;
alter table public.sales_orders add column if not exists kitchen_completed_at timestamptz;
-- sales_set_kitchen_status is installed in Supabase and enforces new -> preparing -> ready -> completed
-- while recording timestamps and a sales audit entry for every kitchen transition.