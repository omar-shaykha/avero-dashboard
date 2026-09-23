create index if not exists company_memberships_created_by_idx
  on public.company_memberships (created_by);

create index if not exists branches_created_by_idx
  on public.branches (created_by);

create index if not exists membership_roles_membership_company_idx
  on public.membership_roles (membership_id, company_id);
create index if not exists membership_roles_branch_company_idx
  on public.membership_roles (branch_id, company_id);
create index if not exists membership_roles_role_id_idx
  on public.membership_roles (role_id);
create index if not exists membership_roles_assigned_by_idx
  on public.membership_roles (assigned_by);

create index if not exists membership_branch_access_membership_company_idx
  on public.membership_branch_access (membership_id, company_id);
create index if not exists membership_branch_access_branch_company_idx
  on public.membership_branch_access (branch_id, company_id);
create index if not exists membership_branch_access_created_by_idx
  on public.membership_branch_access (created_by);
