begin;

select plan(16);

-- Three synthetic users cover a company-wide member, a branch-scoped member,
-- and a member of a separate company. All fixtures roll back at the end.
insert into auth.users (id)
values
  ('10000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003');

insert into public.companies (id, name)
values
  ('20000000-0000-4000-8000-000000000001', 'V2 Test Company A'),
  ('20000000-0000-4000-8000-000000000002', 'V2 Test Company B');

insert into public.roles (id, key, name)
values ('30000000-0000-4000-8000-000000000001', 'v2_test_tenant_role', 'V2 Test Tenant Role');

insert into public.company_memberships (id, company_id, user_id, membership_scope)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'company'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'selected_branches'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'company');

insert into public.branches (id, company_id, code, name, is_default)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'A-01', 'Company A Main', true),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'A-02', 'Company A Second', false),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'B-01', 'Company B Main', true);

insert into public.membership_roles (membership_id, company_id, role_id, branch_id)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002');

insert into public.membership_branch_access (membership_id, company_id, branch_id)
values ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is((select count(*)::integer from public.company_memberships), 1, 'company-wide member sees their membership');
select is((select count(*)::integer from public.company_memberships where company_id = '20000000-0000-4000-8000-000000000002'), 0, 'member cannot read another company membership');
select is((select count(*)::integer from public.branches), 2, 'company-wide scope can read all company branches');
select is((select count(*)::integer from public.branches where company_id = '20000000-0000-4000-8000-000000000002'), 0, 'member cannot read another company branches');
select is((select count(*)::integer from public.membership_roles), 1, 'member sees only their role assignment');
select is((select count(*)::integer from public.membership_branch_access), 0, 'member cannot read another membership branch grants');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.company_memberships), 1, 'branch-scoped member sees their membership');
select is((select count(*)::integer from public.branches), 1, 'branch-scoped member sees only granted branch');
select is((select code from public.branches), 'A-02', 'branch-scoped member sees the assigned branch');
select is((select count(*)::integer from public.membership_roles), 1, 'branch-scoped member sees their own role assignment');
select is((select count(*)::integer from public.membership_branch_access), 1, 'branch-scoped member sees their own branch grant');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*)::integer from public.company_memberships), 1, 'second company member sees their membership');
select is((select count(*)::integer from public.branches), 1, 'second company member sees only their company branch');
select is((select code from public.branches), 'B-01', 'second company member sees their company branch');

select ok(not has_table_privilege('anon', 'public.company_memberships', 'select'), 'anon has no membership table access');
select ok(not has_table_privilege('authenticated', 'public.branches', 'insert,update,delete'), 'authenticated cannot write branch records directly');

select * from finish();
rollback;
