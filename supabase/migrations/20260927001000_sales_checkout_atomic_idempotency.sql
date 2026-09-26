-- Atomic retry protection for POS checkout.
create or replace function public.sales_checkout_idempotent(
 p_company_id uuid,p_cashier uuid,p_shift_id uuid,p_warehouse_id uuid,p_service_type text,p_table_no text,p_discount numeric,p_lines jsonb,p_payments jsonb,p_notes text,p_checkout_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_existing record; v_result jsonb; v_order_id uuid;
begin
 if nullif(trim(p_checkout_key),'') is null then raise exception 'Checkout key is required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||':'||p_checkout_key,0));
 select id,order_no,subtotal,discount,tax,total,cost_total into v_existing
 from sales_orders where company_id=p_company_id and checkout_key=p_checkout_key limit 1;
 if found then
   return jsonb_build_object('order_id',v_existing.id,'order_no',v_existing.order_no,'subtotal',v_existing.subtotal,'discount',v_existing.discount,'tax',v_existing.tax,'total',v_existing.total,'cost',v_existing.cost_total,'replayed',true);
 end if;
 v_result:=public.sales_checkout(p_company_id,p_cashier,p_shift_id,p_warehouse_id,p_service_type,p_table_no,p_discount,p_lines,p_payments,p_notes);
 v_order_id:=(v_result->>'order_id')::uuid;
 update sales_orders set checkout_key=p_checkout_key where id=v_order_id and company_id=p_company_id;
 return v_result||jsonb_build_object('replayed',false);
end $$;
