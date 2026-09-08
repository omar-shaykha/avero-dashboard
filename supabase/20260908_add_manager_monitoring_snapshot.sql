create or replace function public.manager_monitoring_snapshot(
  p_company_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_warehouse_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with
sales_base as (
  select o.id,o.total,o.subtotal,o.discount,o.tax,o.cost_total,o.payment_adjustment,o.created_at,o.warehouse_id,o.channel,o.service_type
  from public.sales_orders o
  where o.company_id=p_company_id
    and o.status='completed'
    and o.created_at>=p_from and o.created_at<p_to
    and (p_warehouse_id is null or o.warehouse_id=p_warehouse_id)
),
refunds_base as (
  select r.amount,r.created_at
  from public.sales_refunds r
  join public.sales_orders o on o.id=r.order_id and o.company_id=p_company_id
  where r.company_id=p_company_id
    and r.created_at>=p_from and r.created_at<p_to
    and (p_warehouse_id is null or o.warehouse_id=p_warehouse_id)
),
sales_summary as (
  select
    count(*)::bigint orders,
    coalesce(sum(total),0)::numeric gross_revenue,
    coalesce(sum(subtotal),0)::numeric subtotal,
    coalesce(sum(discount),0)::numeric discounts,
    coalesce(sum(tax),0)::numeric tax,
    coalesce(sum(cost_total),0)::numeric cost_of_sales,
    coalesce(sum(payment_adjustment),0)::numeric payment_adjustments
  from sales_base
),
refund_summary as (
  select coalesce(sum(amount),0)::numeric refunds from refunds_base
),
sales_lines as (
  select l.*
  from public.sales_order_lines l
  join sales_base s on s.id=l.order_id
),
best_sellers as (
  select
    coalesce(l.product_id::text,md5(coalesce(l.product_name,''))) product_key,
    coalesce(nullif(l.product_name,''),'Unnamed item') product_name,
    coalesce(sum(l.quantity),0)::numeric quantity,
    coalesce(sum(l.line_total),0)::numeric revenue,
    coalesce(sum(l.total_cost),0)::numeric cost,
    coalesce(sum((l.line_total-l.tax_amount)-l.total_cost),0)::numeric gross_profit
  from sales_lines l
  group by coalesce(l.product_id::text,md5(coalesce(l.product_name,''))),coalesce(nullif(l.product_name,''),'Unnamed item')
  order by revenue desc,quantity desc
  limit 10
),
payment_totals as (
  select
    coalesce(nullif(trim(p.payment_method),''),'other') payment_method,
    count(*)::bigint transactions,
    coalesce(sum(p.amount),0)::numeric amount
  from public.sales_payments p
  join sales_base s on s.id=p.order_id
  group by coalesce(nullif(trim(p.payment_method),''),'other')
),
payment_ranked as (
  select payment_method,transactions,amount,
    case when sum(amount) over()=0 then 0 else round(amount*100/sum(amount) over(),1) end share_percent
  from payment_totals
  order by amount desc
  limit 10
),
sales_trend as (
  select date_trunc('day',created_at)::date bucket_date,count(*)::bigint orders,coalesce(sum(total),0)::numeric revenue
  from sales_base
  group by date_trunc('day',created_at)::date
  order by bucket_date
),
stock_agg as (
  select
    i.id,i.name,i.sku,i.category,
    coalesce(i.average_cost,0)::numeric item_cost,
    greatest(coalesce(i.reorder_point,0),coalesce(i.min_stock,0))::numeric threshold,
    coalesce(sum(case when p_warehouse_id is null or b.warehouse_id=p_warehouse_id then b.qty_on_hand else 0 end),0)::numeric qty_on_hand,
    coalesce(sum(case when p_warehouse_id is null or b.warehouse_id=p_warehouse_id then b.qty_reserved else 0 end),0)::numeric qty_reserved,
    coalesce(sum(case when p_warehouse_id is null or b.warehouse_id=p_warehouse_id then b.qty_incoming else 0 end),0)::numeric qty_incoming
  from public.inventory_items i
  left join public.inventory_stock_balances b on b.item_id=i.id and b.company_id=i.company_id
  where i.company_id=p_company_id and i.active=true
  group by i.id,i.name,i.sku,i.category,i.average_cost,i.reorder_point,i.min_stock
),
inventory_summary as (
  select
    count(*)::bigint total_items,
    coalesce(sum(qty_on_hand*item_cost),0)::numeric stock_value,
    coalesce(sum(qty_reserved),0)::numeric reserved_qty,
    coalesce(sum(qty_incoming),0)::numeric incoming_qty,
    count(*) filter (where (qty_on_hand-qty_reserved)<=0)::bigint out_of_stock,
    count(*) filter (where threshold>0 and (qty_on_hand-qty_reserved)<=threshold)::bigint low_stock
  from stock_agg
),
low_stock_rows as (
  select id::text item_id,name,sku,category,qty_on_hand,qty_reserved,(qty_on_hand-qty_reserved)::numeric available_qty,qty_incoming,threshold,item_cost
  from stock_agg
  where (qty_on_hand-qty_reserved)<=0 or (threshold>0 and (qty_on_hand-qty_reserved)<=threshold)
  order by case when (qty_on_hand-qty_reserved)<=0 then 0 else 1 end,(qty_on_hand-qty_reserved)-threshold,name
  limit 10
),
production_base as (
  select po.id,po.status,po.planned_qty,po.actual_qty,po.actual_cost,po.variance_cost,po.created_at,po.started_at,po.completed_at,po.warehouse_id,po.recipe_id,coalesce(pr.name,'Unnamed recipe') recipe_name
  from public.production_orders po
  left join public.production_recipes pr on pr.id=po.recipe_id and pr.company_id=po.company_id
  where po.company_id=p_company_id
    and coalesce(po.completed_at,po.started_at,po.created_at)>=p_from
    and coalesce(po.completed_at,po.started_at,po.created_at)<p_to
    and (p_warehouse_id is null or po.warehouse_id=p_warehouse_id)
),
production_waste_summary as (
  select coalesce(sum(w.quantity),0)::numeric waste_qty,coalesce(sum(w.cost),0)::numeric waste_cost
  from public.production_waste w
  join public.production_orders po on po.id=w.production_order_id and po.company_id=p_company_id
  where w.company_id=p_company_id and w.created_at>=p_from and w.created_at<p_to
    and (p_warehouse_id is null or po.warehouse_id=p_warehouse_id)
),
production_summary as (
  select
    count(*)::bigint total_orders,
    count(*) filter (where status='completed')::bigint completed,
    count(*) filter (where status='in_progress')::bigint in_progress,
    count(*) filter (where status='planned')::bigint planned,
    coalesce(sum(planned_qty),0)::numeric planned_qty,
    coalesce(sum(actual_qty),0)::numeric actual_qty,
    coalesce(sum(actual_cost),0)::numeric actual_cost,
    coalesce(sum(variance_cost),0)::numeric variance_cost
  from production_base
),
top_production as (
  select recipe_id::text recipe_id,recipe_name,count(*)::bigint orders,coalesce(sum(actual_qty),0)::numeric actual_qty,coalesce(sum(planned_qty),0)::numeric planned_qty,coalesce(sum(actual_cost),0)::numeric actual_cost
  from production_base
  group by recipe_id,recipe_name
  order by actual_qty desc,orders desc
  limit 10
)
select jsonb_build_object(
  'from',p_from,
  'to',p_to,
  'warehouse_id',p_warehouse_id,
  'sales',(
    select jsonb_build_object(
      'orders',s.orders,
      'gross_revenue',s.gross_revenue,
      'refunds',r.refunds,
      'net_revenue',s.gross_revenue-r.refunds,
      'avg_ticket',case when s.orders=0 then 0 else round((s.gross_revenue-r.refunds)/s.orders,2) end,
      'subtotal',s.subtotal,
      'discounts',s.discounts,
      'tax',s.tax,
      'cost_of_sales',s.cost_of_sales,
      'gross_profit',(s.subtotal-s.discounts)-s.cost_of_sales,
      'gross_margin_percent',case when (s.subtotal-s.discounts)=0 then 0 else round(((s.subtotal-s.discounts)-s.cost_of_sales)*100/(s.subtotal-s.discounts),1) end,
      'payment_adjustments',s.payment_adjustments
    ) from sales_summary s cross join refund_summary r
  ),
  'inventory',(
    select jsonb_build_object(
      'total_items',total_items,'stock_value',stock_value,'reserved_qty',reserved_qty,'incoming_qty',incoming_qty,'out_of_stock',out_of_stock,'low_stock',low_stock
    ) from inventory_summary
  ),
  'production',(
    select jsonb_build_object(
      'total_orders',p.total_orders,'completed',p.completed,'in_progress',p.in_progress,'planned',p.planned,
      'planned_qty',p.planned_qty,'actual_qty',p.actual_qty,'actual_cost',p.actual_cost,'variance_cost',p.variance_cost,
      'completion_rate',case when p.total_orders=0 then 0 else round(p.completed*100.0/p.total_orders,1) end,
      'yield_percent',case when p.planned_qty=0 then 0 else round(p.actual_qty*100/p.planned_qty,1) end,
      'waste_qty',w.waste_qty,'waste_cost',w.waste_cost
    ) from production_summary p cross join production_waste_summary w
  ),
  'best_sellers',coalesce((select jsonb_agg(to_jsonb(x)) from best_sellers x),'[]'::jsonb),
  'payment_methods',coalesce((select jsonb_agg(to_jsonb(x)) from payment_ranked x),'[]'::jsonb),
  'sales_trend',coalesce((select jsonb_agg(to_jsonb(x)) from sales_trend x),'[]'::jsonb),
  'low_stock',coalesce((select jsonb_agg(to_jsonb(x)) from low_stock_rows x),'[]'::jsonb),
  'top_production',coalesce((select jsonb_agg(to_jsonb(x)) from top_production x),'[]'::jsonb)
);
$$;

revoke all on function public.manager_monitoring_snapshot(uuid,timestamptz,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.manager_monitoring_snapshot(uuid,timestamptz,timestamptz,uuid) to service_role;
