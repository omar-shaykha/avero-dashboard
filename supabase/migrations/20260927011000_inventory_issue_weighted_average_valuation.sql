-- Physical issue order remains FEFO/FIFO; financial valuation uses current weighted-average cost.
create or replace function public.inventory_issue_stock(p_company_id uuid,p_item_id uuid,p_warehouse_id uuid,p_location_id uuid,p_quantity numeric,p_movement_type text,p_reference_type text default null,p_reference_id uuid default null,p_reference_no text default null,p_reason text default null,p_created_by uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare itm inventory_items%rowtype; b record; remaining numeric:=p_quantity; take_qty numeric; move_id uuid; moves jsonb:='[]'::jsonb; c numeric;
begin
 if p_quantity<=0 then raise exception 'Quantity must be greater than zero'; end if;
 select * into itm from inventory_items where id=p_item_id and company_id=p_company_id and active=true;
 if not found then raise exception 'Item not found or inactive'; end if;
 select average_cost into c from inventory_stock_balances where company_id=p_company_id and item_id=p_item_id and warehouse_id=p_warehouse_id and location_id is not distinct from p_location_id;
 c:=coalesce(c,itm.average_cost,0);
 if coalesce(itm.track_batches,false) or coalesce(itm.track_expiry,false) then
  for b in select * from inventory_batches where company_id=p_company_id and item_id=p_item_id and warehouse_id=p_warehouse_id and (p_location_id is null or location_id is not distinct from p_location_id) and status='active' and qty_on_hand>0 and (not coalesce(itm.track_expiry,false) or expiry_date is null or expiry_date>=current_date) order by case when itm.issue_method='fefo' then expiry_date end asc nulls last,created_at asc for update
  loop exit when remaining<=0; take_qty:=least(remaining,b.qty_on_hand); move_id:=inventory_post_movement(p_company_id,p_item_id,p_warehouse_id,p_location_id,p_movement_type,-take_qty,c,p_reference_type,p_reference_id,p_reference_no,p_reason,p_created_by,b.id); moves:=moves||jsonb_build_array(jsonb_build_object('movement_id',move_id,'batch_id',b.id,'batch_no',b.batch_no,'quantity',take_qty,'expiry_date',b.expiry_date,'valuation_unit_cost',c)); remaining:=remaining-take_qty; end loop;
  if remaining>0 then raise exception 'Insufficient eligible batch stock'; end if;
 else move_id:=inventory_post_movement(p_company_id,p_item_id,p_warehouse_id,p_location_id,p_movement_type,-p_quantity,c,p_reference_type,p_reference_id,p_reference_no,p_reason,p_created_by,null); moves:=jsonb_build_array(jsonb_build_object('movement_id',move_id,'quantity',p_quantity,'valuation_unit_cost',c)); end if;
 return jsonb_build_object('issued_qty',p_quantity,'method',itm.issue_method,'valuation','weighted_average','movements',moves);
end $$;