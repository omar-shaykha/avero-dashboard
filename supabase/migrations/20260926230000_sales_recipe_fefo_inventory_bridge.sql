-- POS/recipe inventory bridge. Recipe quantities are normalized to each item's base UOM, then stock is issued through FEFO/FIFO.
create or replace function public.inventory_to_base_qty(p_company_id uuid,p_item_id uuid,p_unit_id uuid,p_qty numeric) returns numeric language plpgsql stable security definer set search_path='public' as $$
declare base_id uuid; f numeric;
begin
 if p_qty is null then return 0; end if;
 select base_unit_id into base_id from inventory_items where id=p_item_id and company_id=p_company_id;
 if p_unit_id is null or base_id is null or p_unit_id=base_id then return p_qty; end if;
 select factor into f from inventory_unit_conversions where company_id=p_company_id and item_id=p_item_id and from_unit_id=p_unit_id and to_unit_id=base_id order by created_at desc limit 1;
 if f is null or f<=0 then raise exception 'Missing unit conversion to base unit for item %',p_item_id; end if;
 return p_qty*f;
end $$;
create or replace function public.sales_issue_inventory(p_company_id uuid,p_product_id uuid,p_quantity numeric,p_warehouse_id uuid,p_order_id uuid,p_order_no text,p_cashier uuid) returns numeric language plpgsql security definer set search_path='public' as $$
declare p sales_products%rowtype; rl record; recipe_yield numeric; scale_qty numeric; ingredient_qty numeric; ingredient_cost numeric; total_cost numeric:=0; uc numeric;
begin
 select * into p from sales_products where id=p_product_id and company_id=p_company_id and active=true;
 if not found then raise exception 'Invalid product'; end if;
 if p_quantity<=0 then raise exception 'Invalid quantity'; end if;
 if p.inventory_policy='recipe_on_sale' and p.recipe_id is not null then
  select greatest(coalesce(yield_qty,1),0.000001) into recipe_yield from production_recipes where id=p.recipe_id and company_id=p_company_id and status='active';
  if recipe_yield is null then raise exception 'Linked recipe is invalid or inactive'; end if;
  scale_qty:=p_quantity/recipe_yield;
  for rl in select l.item_id,l.unit_id,l.quantity,l.waste_percent from production_recipe_lines l where l.company_id=p_company_id and l.recipe_id=p.recipe_id and l.item_id is not null and coalesce(l.optional,false)=false loop
   ingredient_qty:=inventory_to_base_qty(p_company_id,rl.item_id,rl.unit_id,coalesce(rl.quantity,0))*scale_qty*(1+coalesce(rl.waste_percent,0)/100);
   select coalesce(average_cost,0) into ingredient_cost from inventory_items where id=rl.item_id and company_id=p_company_id;
   if ingredient_qty>0 then perform inventory_issue_stock(p_company_id,rl.item_id,p_warehouse_id,null,ingredient_qty,'sale','sales_order',p_order_id,p_order_no,'Recipe consumption from Cashier',p_cashier); total_cost:=total_cost+(ingredient_qty*coalesce(ingredient_cost,0)); end if;
  end loop;
  return total_cost/p_quantity;
 elsif p.track_inventory and p.inventory_item_id is not null then
  select coalesce(average_cost,0) into uc from inventory_items where id=p.inventory_item_id and company_id=p_company_id;
  perform inventory_issue_stock(p_company_id,p.inventory_item_id,p_warehouse_id,null,p_quantity,'sale','sales_order',p_order_id,p_order_no,'Cashier sale',p_cashier);
  return coalesce(uc,0);
 end if;
 return 0;
end $$;
-- sales_checkout now delegates inventory consumption to sales_issue_inventory().