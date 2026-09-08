alter table public.companies
  add column if not exists vat_number text,
  add column if not exists commercial_registration_number text,
  add column if not exists national_address text,
  add column if not exists municipality_license_number text,
  add column if not exists employee_count integer,
  add column if not exists unified_phone text;

alter table public.companies drop constraint if exists companies_employee_count_check;
alter table public.companies add constraint companies_employee_count_check check (employee_count is null or employee_count >= 0);

update public.companies c
set vat_number = z.vat_number
from public.zatca_company_settings z
where z.company_id = c.id and c.vat_number is null and z.vat_number is not null;

create table if not exists public.company_certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  issuer text,
  certificate_number text,
  issued_at date,
  expires_at date,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_certificates_company_idx on public.company_certificates(company_id, created_at desc);
alter table public.company_certificates enable row level security;
drop policy if exists "Tenant reads company certificates" on public.company_certificates;
create policy "Tenant reads company certificates" on public.company_certificates
for select to authenticated
using (company_id in (select company_id from public.user_profiles where user_id = (select auth.uid())));
grant select on public.company_certificates to authenticated;
grant all on public.company_certificates to service_role;

insert into public.permissions(key,name,description)
values
 ('apps.view','View Apps','View connected applications and integrations'),
 ('apps.manage','Manage Apps','Connect and configure company applications'),
 ('zatca.manage','Manage ZATCA','Configure and manage ZATCA/FATOORA integration')
on conflict (key) do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.key='super_admin'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key = any(array[
 'settings.view','settings.manage','apps.view','apps.manage','zatca.manage',
 'users.view','users.manage','users.roles.manage',
 'subscriptions.view','subscriptions.subscribe',
 'sales.view','sales.manage','sales.cashier','sales.discount','sales.refund','sales.void','sales.invoice.customize',
 'inventory.view','inventory.manage','inventory.adjust','inventory.count','inventory.transfer','inventory.returns','inventory.waste','inventory.cost.view',
 'purchasing.view','purchasing.manage','purchasing.approve','purchasing.receive',
 'suppliers.view','suppliers.manage','customers.view','customers.manage','b2b.view','b2b.manage',
 'production.view','production.manage','production.complete','production.cost.view',
 'crm.view','crm.manage','analytics.view'
]::text[])
where r.key='admin'
on conflict do nothing;

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.key = any(array[
 'settings.view','apps.view','sales.view','sales.cashier','inventory.view','purchasing.view','suppliers.view','customers.view','production.view'
]::text[])
where r.key='user'
on conflict do nothing;
