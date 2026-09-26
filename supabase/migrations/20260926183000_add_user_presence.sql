-- Track lightweight AVERO user presence for King Admin.
create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_presence_company_last_seen_idx on public.user_presence(company_id,last_seen_at desc);
alter table public.user_presence enable row level security;
