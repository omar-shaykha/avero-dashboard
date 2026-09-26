alter table public.inventory_items
 add column if not exists name_en text,
 add column if not exists name_ar text,
 add column if not exists default_location_id uuid references public.inventory_locations(id) on delete set null,
 add column if not exists lead_time_days integer not null default 0 check (lead_time_days >= 0),
 add column if not exists average_daily_usage numeric not null default 0 check (average_daily_usage >= 0);
update public.inventory_items set name_en=name where name_en is null;
create unique index if not exists inventory_items_company_sku_uq on public.inventory_items(company_id,sku);