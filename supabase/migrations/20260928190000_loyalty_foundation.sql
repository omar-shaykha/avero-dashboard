-- SaaS finalization: loyalty foundation. HR attendance already uses employee_biometrics/attendance_logs.
create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null default 'Default Loyalty Program',
  points_per_currency numeric(12,4) not null default 1,
  currency_per_point numeric(12,4) not null default 0.01,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id)
);
create table if not exists public.loyalty_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_name text not null,
  phone text,
  email text,
  points numeric(14,2) not null default 0,
  tier text not null default 'Member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loyalty_members_company_idx on public.loyalty_members(company_id, updated_at desc);
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_members enable row level security;
revoke all on public.loyalty_programs, public.loyalty_members from anon, authenticated;
grant all on public.loyalty_programs, public.loyalty_members to service_role;
