-- AVERO OS · ZATCA RLS/index optimization
-- Applied to production Supabase on 2026-09-08.

create index if not exists zatca_egs_warehouse_idx on public.zatca_egs_units(warehouse_id) where warehouse_id is not null;
create index if not exists zatca_docs_egs_idx on public.zatca_documents(egs_unit_id) where egs_unit_id is not null;

drop policy if exists "Tenant reads ZATCA company settings" on public.zatca_company_settings;
create policy "Tenant reads ZATCA company settings" on public.zatca_company_settings for select to authenticated using (
  company_id in (select company_id from public.user_profiles where user_id = (select auth.uid()))
);

drop policy if exists "Tenant reads ZATCA EGS units" on public.zatca_egs_units;
create policy "Tenant reads ZATCA EGS units" on public.zatca_egs_units for select to authenticated using (
  company_id in (select company_id from public.user_profiles where user_id = (select auth.uid()))
);

drop policy if exists "Tenant reads ZATCA documents" on public.zatca_documents;
create policy "Tenant reads ZATCA documents" on public.zatca_documents for select to authenticated using (
  company_id in (select company_id from public.user_profiles where user_id = (select auth.uid()))
);
