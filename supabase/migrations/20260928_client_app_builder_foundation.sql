-- AVERO Client Apps / White-label App Builder foundation
create table if not exists public.client_apps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text not null,
  app_type text not null default 'white_label' check (app_type in ('white_label','avero_module')),
  status text not null default 'draft' check (status in ('draft','configured','building','ready','suspended')),
  logo_url text,
  icon_url text,
  primary_color text default '#19D3FF',
  secondary_color text default '#3478F6',
  background_color text default '#050A12',
  domain text,
  ios_bundle_id text,
  android_package_name text,
  ios_enabled boolean not null default false,
  android_enabled boolean not null default false,
  web_enabled boolean not null default true,
  pwa_enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create table if not exists public.client_app_modules (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.client_apps(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(app_id, module_key)
);

create table if not exists public.client_app_builds (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.client_apps(id) on delete cascade,
  platform text not null check (platform in ('web','pwa','ios','android')),
  status text not null default 'queued' check (status in ('queued','building','ready','failed')),
  version text,
  build_number integer,
  deployment_url text,
  artifact_url text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists client_apps_company_idx on public.client_apps(company_id);
create index if not exists client_app_modules_app_idx on public.client_app_modules(app_id);
create index if not exists client_app_builds_app_idx on public.client_app_builds(app_id, created_at desc);

alter table public.client_apps enable row level security;
alter table public.client_app_modules enable row level security;
alter table public.client_app_builds enable row level security;

comment on table public.client_apps is 'White-label and AVERO-hosted client application definitions.';
comment on table public.client_app_modules is 'Modules enabled per generated client application.';
comment on table public.client_app_builds is 'Build/deployment history for web, PWA, iOS and Android client apps.';
