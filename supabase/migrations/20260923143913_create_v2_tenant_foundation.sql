-- AVERO V2 tenant foundation.
-- Additive only: existing user_profiles and authorization behavior remain intact.

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'removed')),
  membership_scope text not null default 'company'
    check (membership_scope in ('company', 'selected_branches')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint company_memberships_company_user_unique unique (company_id, user_id),
  constraint company_memberships_id_company_unique unique (id, company_id)
);

create index company_memberships_user_status_idx
  on public.company_memberships (user_id, status);
create index company_memberships_company_status_idx
  on public.company_memberships (company_id, status);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  is_default boolean not null default false,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint branches_id_company_unique unique (id, company_id)
);

create unique index branches_company_code_unique
  on public.branches (company_id, lower(code))
  where code is not null and code <> '';
create unique index branches_one_default_per_company
  on public.branches (company_id)
  where is_default;
create index branches_company_status_idx
  on public.branches (company_id, status);

create table public.membership_roles (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null,
  company_id uuid not null,
  role_id uuid not null references public.roles(id) on delete restrict,
  branch_id uuid,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  constraint membership_roles_membership_company_fkey
    foreign key (membership_id, company_id)
    references public.company_memberships(id, company_id) on delete cascade,
  constraint membership_roles_branch_company_fkey
    foreign key (branch_id, company_id)
    references public.branches(id, company_id) on delete cascade
);

create unique index membership_roles_company_scope_unique
  on public.membership_roles (membership_id, role_id)
  where branch_id is null;
create unique index membership_roles_branch_scope_unique
  on public.membership_roles (membership_id, role_id, branch_id)
  where branch_id is not null;
create index membership_roles_company_idx
  on public.membership_roles (company_id, role_id);

create table public.membership_branch_access (
  membership_id uuid not null,
  company_id uuid not null,
  branch_id uuid not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (membership_id, branch_id),
  constraint membership_branch_access_membership_company_fkey
    foreign key (membership_id, company_id)
    references public.company_memberships(id, company_id) on delete cascade,
  constraint membership_branch_access_branch_company_fkey
    foreign key (branch_id, company_id)
    references public.branches(id, company_id) on delete cascade
);

create index membership_branch_access_company_branch_idx
  on public.membership_branch_access (company_id, branch_id);

-- Seed one company membership from each existing profile without changing the
-- legacy profile rows or their current authorization behavior.
insert into public.company_memberships (company_id, user_id, status, membership_scope)
select up.company_id, up.user_id, 'active', 'company'
from public.user_profiles up
where up.company_id is not null
on conflict (company_id, user_id) do nothing;

-- Preserve any current role assignment as a company-wide membership role.
insert into public.membership_roles (membership_id, company_id, role_id)
select cm.id, cm.company_id, up.role_id
from public.user_profiles up
join public.company_memberships cm
  on cm.company_id = up.company_id
 and cm.user_id = up.user_id
where up.company_id is not null
  and up.role_id is not null
on conflict do nothing;

alter table public.company_memberships enable row level security;
alter table public.branches enable row level security;
alter table public.membership_roles enable row level security;
alter table public.membership_branch_access enable row level security;

create policy company_memberships_select_self
  on public.company_memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy branches_select_active_company_member
  on public.branches for select to authenticated
  using (
    exists (
      select 1
      from public.company_memberships cm
      where cm.company_id = branches.company_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
        and (
          cm.membership_scope = 'company'
          or exists (
            select 1
            from public.membership_branch_access mba
            where mba.membership_id = cm.id
              and mba.branch_id = branches.id
          )
        )
    )
  );

create policy membership_roles_select_self
  on public.membership_roles for select to authenticated
  using (
    exists (
      select 1
      from public.company_memberships cm
      where cm.id = membership_roles.membership_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
    )
  );

create policy membership_branch_access_select_self
  on public.membership_branch_access for select to authenticated
  using (
    exists (
      select 1
      from public.company_memberships cm
      where cm.id = membership_branch_access.membership_id
        and cm.user_id = (select auth.uid())
        and cm.status = 'active'
    )
  );

-- New public tables must not inherit broad client writes. Client roles can read
-- their own membership context; server-side service-role routes manage changes.
revoke all on table public.company_memberships,
  public.branches,
  public.membership_roles,
  public.membership_branch_access
from anon, authenticated;

grant select on table public.company_memberships,
  public.branches,
  public.membership_roles,
  public.membership_branch_access
to authenticated;

grant all on table public.company_memberships,
  public.branches,
  public.membership_roles,
  public.membership_branch_access
to service_role;
