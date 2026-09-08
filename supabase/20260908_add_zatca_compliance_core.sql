-- AVERO OS · ZATCA/FATOORA compliance core
-- Applied to production Supabase on 2026-09-08.

create table if not exists public.zatca_company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  enabled boolean not null default false,
  environment text not null default 'sandbox' check (environment in ('sandbox','simulation','production')),
  vat_number text,
  legal_name text,
  legal_name_ar text,
  tax_scheme text not null default 'VAT',
  country_code text not null default 'SA',
  city text,
  district text,
  street text,
  building_number text,
  additional_number text,
  postal_code text,
  address_line text,
  invoice_type text not null default 'both' check (invoice_type in ('simplified','standard','both')),
  default_vat_rate numeric(5,2) not null default 15,
  onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started','configuration_ready','compliance_pending','compliance_passed','production_ready','active','error')),
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zatca_egs_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  warehouse_id uuid references public.inventory_warehouses(id) on delete set null,
  name text not null,
  serial_number text not null,
  solution_name text not null default 'AVERO OS',
  model text,
  environment text not null default 'sandbox' check (environment in ('sandbox','simulation','production')),
  status text not null default 'draft' check (status in ('draft','csr_ready','compliance_ready','production_ready','active','revoked','error')),
  csr_pem text,
  public_key_pem text,
  certificate_request_id text,
  compliance_request_id text,
  production_request_id text,
  certificate_expires_at timestamptz,
  last_invoice_hash text,
  invoice_counter bigint not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, serial_number)
);

create table if not exists public.zatca_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid references public.sales_orders(id) on delete set null,
  egs_unit_id uuid references public.zatca_egs_units(id) on delete set null,
  uuid text not null,
  invoice_number text not null,
  invoice_kind text not null check (invoice_kind in ('simplified','standard','credit_note','debit_note')),
  document_status text not null default 'draft' check (document_status in ('draft','signed','reported','cleared','warning','rejected','failed')),
  issue_at timestamptz not null default now(),
  invoice_counter bigint,
  previous_invoice_hash text,
  invoice_hash text,
  qr_code_base64 text,
  xml_base64 text,
  response_payload jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  submitted_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, uuid)
);

create index if not exists zatca_egs_company_idx on public.zatca_egs_units(company_id, created_at desc);
create index if not exists zatca_docs_company_created_idx on public.zatca_documents(company_id, created_at desc);
create index if not exists zatca_docs_order_idx on public.zatca_documents(order_id) where order_id is not null;

alter table public.zatca_company_settings enable row level security;
alter table public.zatca_egs_units enable row level security;
alter table public.zatca_documents enable row level security;

drop policy if exists "Tenant reads ZATCA company settings" on public.zatca_company_settings;
create policy "Tenant reads ZATCA company settings" on public.zatca_company_settings for select to authenticated using (
  company_id in (select company_id from public.user_profiles where user_id = auth.uid())
);
drop policy if exists "Tenant reads ZATCA EGS units" on public.zatca_egs_units;
create policy "Tenant reads ZATCA EGS units" on public.zatca_egs_units for select to authenticated using (
  company_id in (select company_id from public.user_profiles where user_id = auth.uid())
);
drop policy if exists "Tenant reads ZATCA documents" on public.zatca_documents;
create policy "Tenant reads ZATCA documents" on public.zatca_documents for select to authenticated using (
  company_id in (select company_id from public.user_profiles where user_id = auth.uid())
);

grant select on public.zatca_company_settings, public.zatca_egs_units, public.zatca_documents to authenticated;
grant all on public.zatca_company_settings, public.zatca_egs_units, public.zatca_documents to service_role;
