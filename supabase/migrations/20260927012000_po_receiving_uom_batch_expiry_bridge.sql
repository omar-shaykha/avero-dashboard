-- Canonical PO receiving bridge: purchase UOM -> base UOM, batch/expiry validation, and inventory posting.
create or replace function public.purchasing_receive_po(p_company_id uuid,p_po_id uuid,p_lines jsonb,p_received_by uuid,p_delivery_note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_po purchase_orders%rowtype; v_grn uuid; v_no text; x jsonb; v_pol purchase_order_lines%rowtype; itm inventory_items%rowtype; q numeric; base_q numeric; base_cost numeric; factor numeric; loc uuid; bno text; mfg date; exp date; bid uuid;
begin
 select * into v_po from purchase_orders where id=p_po_id and company_id=p_company_id for update; if not found then raise exception 'PO not found'; end if;
 if v_po.status in('cancelled','closed') then raise exception 'PO cannot be received'; end if;
 v_no:='GRN-'||to_char(clock_timestamp(),'YYMMDDHH24MISSMS');
 insert into purchase_receipts(company_id,grn_no,po_id,supplier_id,warehouse_id,supplier_delivery_note,received_by) values(p_company_id,v_no,p_po_id,v_po.supplier_id,v_po.warehouse_id,p_delivery_note,p_received_by) returning id into v_grn;
 for x in select * from jsonb_array_elements(p_lines) loop
  select * into v_pol from purchase_order_lines where id=(x->>'po_line_id')::uuid and po_id=p_po_id and company_id=p_company_id for update; if not found then raise exception 'Invalid PO line'; end if;
  select * into itm from inventory_items where id=v_pol.item_id and company_id=p_company_id and active=true; if not found then raise exception 'Inventory item not found'; end if;
  q:=coalesce((x->>'quantity')::numeric,0); if q<=0 or v_pol.received_qty+q>v_pol.quantity then raise exception 'Invalid receiving quantity'; end if;
  loc:=coalesce(nullif(x->>'location_id','')::uuid,itm.default_location_id); bno:=nullif(trim(x->>'batch_no'),''); mfg:=nullif(x->>'manufacture_date','')::date; exp:=nullif(x->>'expiry_date','')::date;
  if itm.track_batches and bno is null then raise exception 'Batch number is required for %',itm.name; end if;
  if itm.track_expiry and exp is null then raise exception 'Expiry date is required for %',itm.name; end if;
  if exp is not null and exp<current_date then raise exception 'Expired stock cannot be received for %',itm.name; end if;
  if mfg is not null and exp is not null and exp<mfg then raise exception 'Expiry date cannot precede manufacture date'; end if;
  factor:=1;
  if v_pol.unit_id is not null and itm.base_unit_id is not null and v_pol.unit_id<>itm.base_unit_id then
   if v_pol.unit_id=itm.purchase_unit_id then factor:=coalesce(nullif(itm.purchase_to_base_factor,0),1);
   else select factor into factor from inventory_unit_conversions where company_id=p_company_id and (item_id=v_pol.item_id or item_id is null) and from_unit_id=v_pol.unit_id and to_unit_id=itm.base_unit_id order by item_id nulls last limit 1; if factor is null or factor<=0 then raise exception 'Missing unit conversion for %',itm.name; end if; end if;
  end if;
  base_q:=q*factor; base_cost:=case when factor>0 then v_pol.unit_price/factor else v_pol.unit_price end;
  insert into purchase_receipt_lines(company_id,receipt_id,po_line_id,item_id,quantity,unit_cost,batch_no,manufacture_date,expiry_date,location_id) values(p_company_id,v_grn,v_pol.id,v_pol.item_id,q,v_pol.unit_price,bno,mfg,exp,loc);
  bid:=null;
  if itm.track_batches or itm.track_expiry then
   select id into bid from inventory_batches where company_id=p_company_id and item_id=v_pol.item_id and warehouse_id=v_po.warehouse_id and location_id is not distinct from loc and batch_no=coalesce(bno,'EXP-'||coalesce(exp::text,'NOEXP')) for update;
   if bid is null then insert into inventory_batches(company_id,item_id,warehouse_id,location_id,batch_no,manufacture_date,expiry_date,unit_cost,qty_on_hand,status) values(p_company_id,v_pol.item_id,v_po.warehouse_id,loc,coalesce(bno,'EXP-'||coalesce(exp::text,'NOEXP')),mfg,exp,base_cost,0,'active') returning id into bid; end if;
  end if;
  perform inventory_post_movement(p_company_id,v_pol.item_id,v_po.warehouse_id,loc,'purchase_receipt',base_q,base_cost,'purchase_receipt',v_grn,v_no,'PO receipt',p_received_by,bid);
  update purchase_order_lines set received_qty=received_qty+q where id=v_pol.id;
  update inventory_incoming_stock set quantity_received=least(quantity_ordered,quantity_received+q),status=case when quantity_received+q>=quantity_ordered then 'received' else 'partial' end,updated_at=now() where company_id=p_company_id and reference_type='purchase_order' and reference_id=p_po_id and item_id=v_pol.item_id;
  update inventory_items set last_purchase_cost=base_cost,updated_at=now(),updated_by=p_received_by where id=v_pol.item_id and company_id=p_company_id;
 end loop;
 update purchase_orders p set status=case when not exists(select 1 from purchase_order_lines l where l.po_id=p.id and l.received_qty<l.quantity) then 'received' else 'partially_received' end,updated_at=now() where p.id=p_po_id;
 return v_grn;
end $$;
