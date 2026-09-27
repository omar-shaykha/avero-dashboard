alter table public.sales_orders add column if not exists void_reason text;
create table if not exists public.sales_audit_log(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,order_id uuid references public.sales_orders(id) on delete set null,action text not null,reason text,performed_by uuid,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists sales_audit_log_order_idx on public.sales_audit_log(company_id,order_id,created_at desc);
create or replace function public.sales_void_order(p_company_id uuid,p_order_id uuid,p_user_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $
declare o sales_orders%rowtype;
begin
 if nullif(trim(p_reason),'') is null then raise exception 'Void reason is required'; end if;
 select * into o from sales_orders where id=p_order_id and company_id=p_company_id for update;
 if not found then raise exception 'Sales order not found'; end if;
 if o.status not in ('draft','held') then raise exception 'Only unpaid draft or held orders can be voided. Paid sales require refund.'; end if;
 update sales_orders set status='voided',voided_at=now(),voided_by=p_user_id,void_reason=trim(p_reason),tracking_status='cancelled' where id=p_order_id and company_id=p_company_id;
 insert into sales_audit_log(company_id,order_id,action,reason,performed_by,metadata) values(p_company_id,p_order_id,'void',trim(p_reason),p_user_id,jsonb_build_object('previous_status',o.status,'order_no',o.order_no,'total',o.total));
 return jsonb_build_object('order_id',p_order_id,'order_no',o.order_no,'status','voided');
end $;