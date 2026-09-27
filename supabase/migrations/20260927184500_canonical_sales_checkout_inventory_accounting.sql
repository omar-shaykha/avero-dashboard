-- Canonical POS checkout: inventory consumption + payment validation + accounting.
create or replace function public.sales_checkout(
 p_company_id uuid,p_cashier uuid,p_shift_id uuid,p_warehouse_id uuid,p_service_type text,p_table_no text,p_discount numeric,p_lines jsonb,p_payments jsonb,p_notes text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 oid uuid; ono text; x jsonb; p sales_products%rowtype; q numeric; lp numeric; ld numeric; tx numeric;
 line_listed numeric; line_net numeric; sub numeric:=0; v_tax numeric:=0; cost numeric:=0; uc numeric:=0;
 disc numeric:=coalesce(p_discount,0); disc_ratio numeric:=0; pay numeric:=0; pay_base numeric:=0;
 prices_incl boolean:=false; cashier_label text; method_key text; method_markup numeric:=0; price_multiplier numeric:=1;
begin
 if jsonb_array_length(coalesce(p_lines,'[]'::jsonb))=0 then raise exception 'Cart is empty'; end if;
 if p_warehouse_id is null then raise exception 'Warehouse is required'; end if;
 select coalesce(prices_include_tax,false) into prices_incl from sales_settings where company_id=p_company_id;
 prices_incl:=coalesce(prices_incl,false);
 select lower(trim(v->>'payment_method')) into method_key from jsonb_array_elements(coalesce(p_payments,'[]'::jsonb)) v where nullif(trim(v->>'payment_method'),'') is not null limit 1;
 if method_key is not null then
  select greatest(coalesce(adjustment_percent,0),0) into method_markup from sales_payment_methods
  where company_id=p_company_id and active=true and adjustment_type='markup' and (lower(code)=method_key or lower(name)=method_key)
  order by sort_order,created_at limit 1;
  method_markup:=coalesce(method_markup,0);
 end if;
 price_multiplier:=1+(method_markup/100);
 select coalesce(nullif(full_name,''),nullif(username,''),nullif(nickname,''),'Cashier') into cashier_label from user_profiles where user_id=p_cashier and company_id=p_company_id limit 1;
 ono:='S-'||to_char(clock_timestamp(),'YYMMDDHH24MISSMS');
 insert into sales_orders(company_id,order_no,shift_id,cashier_id,cashier_name,warehouse_id,service_type,table_no,status,tracking_status,notes)
 values(p_company_id,ono,p_shift_id,p_cashier,cashier_label,p_warehouse_id,coalesce(p_service_type,'retail'),p_table_no,'completed','new',p_notes) returning id into oid;
 for x in select * from jsonb_array_elements(p_lines) loop
  select * into p from sales_products where id=(x->>'product_id')::uuid and company_id=p_company_id and active=true;
  if not found then raise exception 'Invalid product'; end if;
  q:=coalesce((x->>'quantity')::numeric,0); if q<=0 then raise exception 'Invalid quantity'; end if;
  lp:=round((p.price*price_multiplier)::numeric,2); ld:=greatest(coalesce((x->>'discount')::numeric,0),0);
  if ld>q*lp then raise exception 'Invalid line discount'; end if;
  line_listed:=(q*lp)-ld;
  if p.tax_enabled and coalesce(p.tax_rate,0)>0 and prices_incl then line_net:=line_listed/(1+p.tax_rate/100); tx:=line_listed-line_net;
  else line_net:=line_listed; tx:=case when p.tax_enabled then line_net*coalesce(p.tax_rate,0)/100 else 0 end; end if;
  uc:=public.sales_issue_inventory(p_company_id,p.id,q,p_warehouse_id,oid,ono,p_cashier);
  insert into sales_order_lines(company_id,order_id,product_id,inventory_item_id,recipe_id,product_name,quantity,unit_price,discount,tax_rate,tax_amount,line_total,unit_cost,total_cost,notes)
  values(p_company_id,oid,p.id,p.inventory_item_id,p.recipe_id,p.name,q,lp,ld,case when p.tax_enabled then coalesce(p.tax_rate,0) else 0 end,tx,line_net+tx,uc,uc*q,nullif(x->>'notes',''));
  sub:=sub+line_net; cost:=cost+(uc*q);
 end loop;
 if disc<0 or disc>sub then raise exception 'Invalid order discount'; end if;
 disc_ratio:=case when sub>0 then disc/sub else 0 end;
 with calc as (select id,greatest(line_total-tax_amount,0) net_base,greatest(coalesce(tax_rate,0),0) rate from sales_order_lines where order_id=oid and company_id=p_company_id)
 update sales_order_lines l set tax_amount=case when c.rate>0 then c.net_base*(1-disc_ratio)*c.rate/100 else 0 end,
 line_total=c.net_base+case when c.rate>0 then c.net_base*(1-disc_ratio)*c.rate/100 else 0 end from calc c where l.id=c.id;
 select coalesce(sum(tax_amount),0) into v_tax from sales_order_lines where order_id=oid and company_id=p_company_id;
 for x in select * from jsonb_array_elements(coalesce(p_payments,'[]'::jsonb)) loop
  if nullif(trim(x->>'payment_method'),'') is null then raise exception 'Payment method is required'; end if;
  pay_base:=pay_base+coalesce((x->>'base_amount')::numeric,(x->>'amount')::numeric,0); pay:=pay+coalesce((x->>'amount')::numeric,0);
  insert into sales_payments(company_id,order_id,payment_method,amount,reference_no,created_by)
  values(p_company_id,oid,lower(trim(x->>'payment_method')),coalesce((x->>'amount')::numeric,0),x->>'reference_no',p_cashier);
 end loop;
 if abs(pay_base-((sub-disc)+v_tax))>0.01 then raise exception 'Payment base total mismatch'; end if;
 if abs(pay-((sub-disc)+v_tax))>0.01 then raise exception 'Payment total mismatch'; end if;
 update sales_orders set subtotal=sub,discount=disc,tax=v_tax,payment_adjustment=0,total=(sub-disc)+v_tax,cost_total=cost where id=oid;
 perform public.accounting_post_sales_order(p_company_id,oid);
 return jsonb_build_object('order_id',oid,'order_no',ono,'subtotal',sub,'tax',v_tax,'discount',disc,'payment_adjustment',0,'total',(sub-disc)+v_tax,'cost',cost,'profit',(sub-disc)-cost);
end $$;
