create or replace function public.sales_allocate_refund_payments(p_company_id uuid,p_order_id uuid,p_refund_id uuid,p_amount numeric)
returns void language plpgsql security definer set search_path=public as $$
declare x record; paid numeric; remaining numeric:=greatest(coalesce(p_amount,0),0); alloc numeric;
begin
 select coalesce(sum(amount),0) into paid from sales_payments where company_id=p_company_id and order_id=p_order_id;
 if paid<=0 or remaining<=0 then raise exception 'Refund payment allocation unavailable'; end if;
 for x in select payment_method,sum(amount) amount from sales_payments where company_id=p_company_id and order_id=p_order_id group by payment_method order by payment_method loop
  alloc:=case when remaining<=0 then 0 else least(remaining,round(p_amount*(x.amount/paid),2)) end;
  if alloc>0 then insert into sales_refund_payments(company_id,refund_id,payment_method,amount) values(p_company_id,p_refund_id,lower(x.payment_method),alloc); remaining:=remaining-alloc; end if;
 end loop;
 if abs(remaining)>0.01 then
  select payment_method into x from sales_payments where company_id=p_company_id and order_id=p_order_id order by created_at limit 1;
  insert into sales_refund_payments(company_id,refund_id,payment_method,amount) values(p_company_id,p_refund_id,lower(x.payment_method),remaining);
 elsif remaining<>0 then
  update sales_refund_payments set amount=amount+remaining where id=(select id from sales_refund_payments where company_id=p_company_id and refund_id=p_refund_id order by amount desc,id limit 1);
 end if;
end $$;
create or replace function public.sales_finalize_refund_accounting() returns trigger language plpgsql security definer set search_path=public as $$
begin perform sales_allocate_refund_payments(new.company_id,new.order_id,new.id,new.amount); perform accounting_post_sales_refund(new.company_id,new.id); return new; end $$;
drop trigger if exists sales_refunds_post_amount_accounting on public.sales_refunds;
create constraint trigger sales_refunds_post_amount_accounting after update of amount on public.sales_refunds deferrable initially deferred for each row
when (new.amount>0 and old.amount is distinct from new.amount) execute function public.sales_finalize_refund_accounting();