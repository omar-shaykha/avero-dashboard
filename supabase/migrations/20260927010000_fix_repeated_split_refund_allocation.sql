-- Prevent repeated partial refunds from over-allocating any original tender.
create or replace function public.sales_allocate_refund_payments(p_company_id uuid,p_order_id uuid,p_refund_id uuid,p_amount numeric)
returns void language plpgsql security definer set search_path=public as $$
declare x record; remaining numeric:=round(greatest(coalesce(p_amount,0),0),2); alloc numeric; cap numeric; last_method text;
begin
 delete from sales_refund_payments where company_id=p_company_id and refund_id=p_refund_id;
 if remaining<=0 then raise exception 'Refund payment allocation unavailable'; end if;
 for x in
  with paid as (
   select lower(payment_method) payment_method,sum(amount)::numeric paid from sales_payments where company_id=p_company_id and order_id=p_order_id group by lower(payment_method)
  ), prior as (
   select lower(rp.payment_method) payment_method,sum(rp.amount)::numeric refunded from sales_refund_payments rp join sales_refunds r on r.id=rp.refund_id
   where rp.company_id=p_company_id and r.order_id=p_order_id and rp.refund_id<>p_refund_id group by lower(rp.payment_method)
  )
  select p.payment_method,greatest(p.paid-coalesce(pr.refunded,0),0)::numeric capacity from paid p left join prior pr using(payment_method)
  where greatest(p.paid-coalesce(pr.refunded,0),0)>0 order by p.payment_method
 loop
  exit when remaining<=0; cap:=round(x.capacity,2); alloc:=least(remaining,cap);
  if alloc>0 then insert into sales_refund_payments(company_id,refund_id,payment_method,amount) values(p_company_id,p_refund_id,x.payment_method,alloc); remaining:=round(remaining-alloc,2); last_method:=x.payment_method; end if;
 end loop;
 if remaining>0.009 then raise exception 'Refund exceeds remaining payment capacity by %',remaining; end if;
 if remaining<>0 and last_method is not null then update sales_refund_payments set amount=amount+remaining where company_id=p_company_id and refund_id=p_refund_id and payment_method=last_method; end if;
 update sales_refunds r set payment_method=case when (select count(*) from sales_refund_payments rp where rp.refund_id=r.id)=1 then (select payment_method from sales_refund_payments rp where rp.refund_id=r.id limit 1) else 'split' end where r.id=p_refund_id and r.company_id=p_company_id;
end $$;
