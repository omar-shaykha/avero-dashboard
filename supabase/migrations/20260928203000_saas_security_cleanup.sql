-- SaaS security cleanup: privileged RPCs are server/service-role only.
do $$
declare r record;
begin
 for r in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (
 'accounting_post_sales_refund','ensure_company_credit_payment_method','inventory_issue_stock','inventory_to_base_qty',
 'sales_allocate_refund_payments','sales_checkout_idempotent','sales_finalize_refund_accounting','sales_issue_inventory',
 'sales_partial_refund','sales_set_kitchen_status','sales_void_order')
 loop execute format('revoke execute on function %s from public, anon, authenticated',r.sig); end loop;
end $$;

do $$
declare t text;
begin
 foreach t in array array['loyalty_members','loyalty_programs','marketing_social_comments','user_presence']
 loop
  execute format('drop policy if exists tenant_company_access on public.%I',t);
  execute format('create policy tenant_company_access on public.%I for all to authenticated using (company_id=(select up.company_id from public.user_profiles up where up.user_id=(select auth.uid()))) with check (company_id=(select up.company_id from public.user_profiles up where up.user_id=(select auth.uid())))',t);
 end loop;
end $$;