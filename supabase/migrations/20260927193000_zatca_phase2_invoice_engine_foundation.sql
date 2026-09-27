-- ZATCA Phase 2 invoice engine foundation.
-- Immutable invoice snapshots and submission lifecycle; signing/reporting/clearance remain separate server actions.
alter table public.zatca_documents
  add column if not exists invoice_type_code text,
  add column if not exists currency_code text not null default 'SAR',
  add column if not exists seller_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists buyer_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists totals_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists lines_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists tax_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists reporting_deadline timestamptz,
  add column if not exists submission_type text,
  add column if not exists zatca_request_id text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_submission_at timestamptz;

do $$ begin
  alter table public.zatca_documents add constraint zatca_documents_submission_type_chk
    check (submission_type is null or submission_type in ('reporting','clearance'));
exception when duplicate_object then null; end $$;

create unique index if not exists zatca_docs_order_kind_unique
  on public.zatca_documents(company_id,order_id,invoice_kind)
  where order_id is not null and invoice_kind in ('simplified','standard');

create index if not exists zatca_docs_submission_queue_idx
  on public.zatca_documents(company_id,document_status,submission_type,reporting_deadline);

create or replace function public.zatca_next_invoice_counter(p_company_id uuid,p_egs_unit_id uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_next bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||':'||coalesce(p_egs_unit_id::text,''),0));
 select coalesce(max(invoice_counter),0)+1 into v_next
 from public.zatca_documents
 where company_id=p_company_id and (p_egs_unit_id is null or egs_unit_id=p_egs_unit_id);
 return v_next;
end $$;

revoke all on function public.zatca_next_invoice_counter(uuid,uuid) from public,anon,authenticated;
grant execute on function public.zatca_next_invoice_counter(uuid,uuid) to service_role;

comment on column public.zatca_documents.submission_type is 'standard tax invoices use clearance; simplified tax invoices use reporting';
comment on column public.zatca_documents.reporting_deadline is 'For simplified invoices, target reporting deadline is issue time + 24 hours.';
