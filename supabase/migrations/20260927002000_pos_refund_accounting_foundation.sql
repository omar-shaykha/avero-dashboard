create table if not exists public.sales_refund_payments(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 refund_id uuid not null references public.sales_refunds(id) on delete cascade, payment_method text not null,
 amount numeric not null check(amount>=0), created_at timestamptz not null default now());
create index if not exists sales_refund_payments_refund_idx on public.sales_refund_payments(company_id,refund_id);

create or replace function public.accounting_post_sales_refund(p_company_id uuid,p_refund_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.sales_refunds%rowtype; v_entry uuid; v_existing uuid; x record;
 a_cash uuid; a_card uuid; a_inv uuid; a_vat uuid; a_rev uuid; a_cogs uuid;
 v_tax numeric:=0; v_cost numeric:=0; v_net numeric:=0;
begin
 select * into r from sales_refunds where id=p_refund_id and company_id=p_company_id;
 if not found then raise exception 'Refund not found'; end if;
 select id into v_existing from accounting_journal_entries where company_id=p_company_id and reference_type='sales_refund' and reference_id=p_refund_id and status<>'reversed' limit 1;
 if v_existing is not null then return v_existing; end if;
 select coalesce(sum(tax_amount),0),coalesce(sum(cost_amount),0) into v_tax,v_cost from sales_refund_lines where company_id=p_company_id and refund_id=p_refund_id;
 v_net:=greatest(coalesce(r.amount,0)-v_tax,0);
 a_cash:=accounting_ensure_account(p_company_id,'1010','Cash','النقدية','asset');
 a_card:=accounting_ensure_account(p_company_id,'1020','Card / Bank Clearing','تسوية البطاقات والبنوك','asset');
 a_inv:=accounting_ensure_account(p_company_id,'1100','Inventory Asset','أصل المخزون','asset');
 a_vat:=accounting_ensure_account(p_company_id,'2100','VAT Payable','ضريبة القيمة المضافة المستحقة','liability');
 a_rev:=accounting_ensure_account(p_company_id,'4000','Sales Revenue','إيرادات المبيعات','revenue');
 a_cogs:=accounting_ensure_account(p_company_id,'5000','Cost of Goods Sold','تكلفة البضاعة المباعة','expense');
 insert into accounting_journal_entries(company_id,entry_no,reference_type,reference_id,description,created_by)
 values(p_company_id,'J-'||to_char(clock_timestamp(),'YYMMDDHH24MISS')||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,6),'sales_refund',p_refund_id,'POS refund '||r.refund_no,r.created_by) returning id into v_entry;
 if v_net>0 then insert into accounting_journal_lines(company_id,journal_entry_id,account_id,description,debit) values(p_company_id,v_entry,a_rev,'Sales refund',v_net); end if;
 if v_tax>0 then insert into accounting_journal_lines(company_id,journal_entry_id,account_id,description,debit) values(p_company_id,v_entry,a_vat,'Output VAT reversal',v_tax); end if;
 for x in select payment_method,sum(amount) amount from sales_refund_payments where company_id=p_company_id and refund_id=p_refund_id group by payment_method loop
   insert into accounting_journal_lines(company_id,journal_entry_id,account_id,description,credit)
   values(p_company_id,v_entry,case when lower(x.payment_method)='cash' then a_cash else a_card end,'Refund - '||x.payment_method,x.amount);
 end loop;
 if v_cost>0 then
   insert into accounting_journal_lines(company_id,journal_entry_id,account_id,description,credit) values(p_company_id,v_entry,a_cogs,'COGS reversal',v_cost);
   insert into accounting_journal_lines(company_id,journal_entry_id,account_id,description,debit) values(p_company_id,v_entry,a_inv,'Inventory restored by refund',v_cost);
 end if;
 if abs((select coalesce(sum(debit-credit),0) from accounting_journal_lines where journal_entry_id=v_entry))>0.01 then raise exception 'Refund accounting journal is not balanced'; end if;
 return v_entry;
end $$;