-- Partial line/quantity refunds with explicit stock-return policy.
alter table public.sales_orders drop constraint if exists sales_orders_status_check;
alter table public.sales_orders add constraint sales_orders_status_check check(status in ('draft','held','completed','partially_refunded','refunded','voided','cancelled'));
alter table public.sales_refund_lines add column if not exists restock boolean not null default false;

create or replace function public.sales_partial_refund(p_company_id uuid,p_order_id uuid,p_user_id uuid,p_lines jsonb,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare o sales_orders%rowtype; req record; l sales_order_lines%rowtype; already numeric; qty numeric; do_restock boolean; amt numeric; tax numeric; cost numeric; rid uuid; rno text; total numeric:=0; total_tax numeric:=0; total_cost numeric:=0; fully boolean; pm text; ic numeric;
begin
 select * into o from sales_orders where id=p_order_id and company_id=p_company_id for update;
 if not found then raise exception 'Sales order not found'; end if;
 if o.status not in ('completed','partially_refunded') then raise exception 'Order cannot be refunded'; end if;
 if jsonb_array_length(coalesce(p_lines,'[]'::jsonb))=0 then raise exception 'Select at least one line'; end if;
 select lower(payment_method) into pm from sales_payments where company_id=p_company_id and order_id=p_order_id order by created_at limit 1;
 rno:='R-'||to_char(clock_timestamp(),'YYMMDDHH24MISSMS');
 insert into sales_refunds(company_id,order_id,refund_no,amount,reason,payment_method,created_by) values(p_company_id,p_order_id,rno,0,nullif(trim(p_reason),''),pm,p_user_id) returning id into rid;
 for req in select * from jsonb_to_recordset(p_lines) as x(order_line_id uuid,quantity numeric,restock boolean) loop
  select * into l from sales_order_lines where id=req.order_line_id and order_id=p_order_id and company_id=p_company_id;
  if not found then raise exception 'Invalid order line'; end if;
  select coalesce(sum(quantity),0) into already from sales_refund_lines where company_id=p_company_id and order_line_id=l.id;
  qty:=coalesce(req.quantity,0); if qty<=0 or qty>l.quantity-already then raise exception 'Invalid refund quantity for %',l.product_name; end if;
  do_restock:=coalesce(req.restock,false);
  if do_restock and l.recipe_id is not null then raise exception 'Prepared recipe items cannot be restocked'; end if;
  if do_restock and l.inventory_item_id is null then raise exception 'This item is not linked to inventory and cannot be restocked'; end if;
  amt:=round((coalesce(l.line_total,0)/nullif(l.quantity,0))*qty,2); tax:=round((coalesce(l.tax_amount,0)/nullif(l.quantity,0))*qty,2); cost:=round((coalesce(l.total_cost,0)/nullif(l.quantity,0))*qty,4);
  insert into sales_refund_lines(company_id,refund_id,order_line_id,quantity,amount,tax_amount,cost_amount,restock) values(p_company_id,rid,l.id,qty,amt,tax,cost,do_restock);
  total:=total+amt; total_tax:=total_tax+tax; total_cost:=total_cost+cost;
  if do_restock then
   select coalesce(average_cost,l.unit_cost,0) into ic from inventory_items where id=l.inventory_item_id and company_id=p_company_id;
   perform inventory_post_movement(p_company_id,l.inventory_item_id,o.warehouse_id,null,'refund',qty,coalesce(ic,l.unit_cost,0),'sales_refund',rid,rno,'POS partial refund - approved restock',p_user_id,null);
  end if;
 end loop;
 update sales_refunds set amount=total where id=rid;
 select not exists(select 1 from sales_order_lines ol where ol.order_id=p_order_id and ol.company_id=p_company_id and coalesce((select sum(rfl.quantity) from sales_refund_lines rfl where rfl.company_id=p_company_id and rfl.order_line_id=ol.id),0)<ol.quantity) into fully;
 update sales_orders set status=case when fully then 'refunded' else 'partially_refunded' end where id=p_order_id and company_id=p_company_id;
 return jsonb_build_object('refund_id',rid,'refund_no',rno,'amount',total,'tax',total_tax,'cost',total_cost,'status',case when fully then 'refunded' else 'partially_refunded' end);
end $$;
