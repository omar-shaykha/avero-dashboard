-- AVERO SaaS platform persistence upgrade
-- Run once in Supabase SQL Editor.

begin;

-- 1) Professional user profile fields
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists username text;
alter table public.user_profiles add column if not exists nickname text;
alter table public.user_profiles add column if not exists age integer;
alter table public.user_profiles add column if not exists talents text;
alter table public.user_profiles add column if not exists job_title text;
alter table public.user_profiles add column if not exists bio text;
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists user_profiles_username_unique
  on public.user_profiles (lower(username)) where username is not null and username <> '';

-- 2) Per-user application settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  language text not null default 'en' check (language in ('en','ar')),
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  notification_master boolean not null default true,
  notification_sound boolean not null default true,
  notification_prefs jsonb not null default '{
    "new_lead": true,
    "qualified_lead": true,
    "quotation_request": true,
    "negotiation_started": true,
    "high_interest": true,
    "new_customer_message": true,
    "won_deal": true,
    "lost_deal": false,
    "event_soon": true,
    "ai_handoff": true,
    "automation_error": true,
    "subscription_expiry": true,
    "security_alert": true
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_settings_company_id_idx on public.user_settings(company_id);

insert into public.user_settings (user_id, company_id)
select user_id, company_id from public.user_profiles
where company_id is not null
on conflict (user_id) do nothing;

-- 3) In-app notifications feed
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_notifications_company_created_idx on public.app_notifications(company_id, created_at desc);
create index if not exists app_notifications_user_created_idx on public.app_notifications(user_id, created_at desc);

-- 4) 24/7 AVERO Help Center conversation history
create table if not exists public.help_center_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists help_center_messages_user_created_idx on public.help_center_messages(user_id, created_at);
create index if not exists help_center_messages_company_created_idx on public.help_center_messages(company_id, created_at desc);

-- 5) AI control-center action requests + audit trail
create table if not exists public.ai_action_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null,
  action_type text,
  status text not null default 'pending' check (status in ('pending','awaiting_confirmation','approved','executing','completed','failed','cancelled')),
  requires_confirmation boolean not null default true,
  confirmed_at timestamptz,
  executed_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_action_requests_company_status_idx on public.ai_action_requests(company_id, status, created_at desc);
create index if not exists ai_action_requests_user_created_idx on public.ai_action_requests(user_id, created_at desc);

-- RLS
alter table public.user_settings enable row level security;
alter table public.app_notifications enable row level security;
alter table public.help_center_messages enable row level security;
alter table public.ai_action_requests enable row level security;

-- Idempotent policy recreation
 drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings" on public.user_settings for select to authenticated using (user_id = auth.uid());
 drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings" on public.user_settings for insert to authenticated with check (user_id = auth.uid());
 drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings" on public.user_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

 drop policy if exists "Users can read own notifications" on public.app_notifications;
create policy "Users can read own notifications" on public.app_notifications for select to authenticated using (
  user_id = auth.uid() or company_id in (select company_id from public.user_profiles where user_id = auth.uid())
);
 drop policy if exists "Users can update own notifications" on public.app_notifications;
create policy "Users can update own notifications" on public.app_notifications for update to authenticated using (
  user_id = auth.uid() or company_id in (select company_id from public.user_profiles where user_id = auth.uid())
);

 drop policy if exists "Users can read own help messages" on public.help_center_messages;
create policy "Users can read own help messages" on public.help_center_messages for select to authenticated using (user_id = auth.uid());
 drop policy if exists "Users can insert own help messages" on public.help_center_messages;
create policy "Users can insert own help messages" on public.help_center_messages for insert to authenticated with check (user_id = auth.uid());

 drop policy if exists "Users can read own action requests" on public.ai_action_requests;
create policy "Users can read own action requests" on public.ai_action_requests for select to authenticated using (user_id = auth.uid());
 drop policy if exists "Users can insert own action requests" on public.ai_action_requests;
create policy "Users can insert own action requests" on public.ai_action_requests for insert to authenticated with check (user_id = auth.uid());

-- Explicit grants for authenticated app reads/writes; service_role bypasses RLS.
grant select, insert, update on public.user_settings to authenticated;
grant select, update on public.app_notifications to authenticated;
grant select, insert on public.help_center_messages to authenticated;
grant select, insert on public.ai_action_requests to authenticated;
grant all on public.user_settings, public.app_notifications, public.help_center_messages, public.ai_action_requests to service_role;

commit;
