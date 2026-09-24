-- GO pickup is opt-in: staff publish items and a real pickup location first.
alter table public.sales_products add column if not exists show_on_go boolean not null default false;
alter table public.sales_orders add column if not exists pickup_branch_id uuid references public.branches(id);
alter table public.sales_orders add column if not exists go_sale_id uuid references public.sales_orders(id);

create table if not exists public.go_stores (
  company_id uuid primary key references public.companies(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  pickup_branch_id uuid references public.branches(id) on delete set null,
  pickup_address text not null default '',
  prep_minutes integer not null default 30 check (prep_minutes between 5 and 240),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists go_orders_company_time on public.sales_orders(company_id,created_at desc) where channel='go';
alter table public.go_stores enable row level security;
revoke all on public.go_stores from anon,authenticated;
grant all on public.go_stores to service_role;

-- The checkout route uses a service-only RPC so prices, tax and order lines
-- are read from the database and inserted in one transaction.
create or replace function public.go_place_pickup_order(
  p_slug text, p_name text, p_phone text, p_notes text, p_items jsonb
) returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare
  v_store public.go_stores%rowtype;
  v_company_name text;
  v_cashier uuid;
  v_order_id uuid;
  v_order_no text;
  v_prices_include_tax boolean := false;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_line_listed numeric;
  v_net numeric;
  v_line_tax numeric;
  v_qty integer;
  v_item jsonb;
  v_product public.sales_products%rowtype;
  v_seen uuid[] := array[]::uuid[];
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'Invalid cart';
  end if;
  if length(btrim(coalesce(p_name,''))) not between 2 and 80
     or coalesce(p_phone,'') !~ '^\+?[0-9]{8,15}$'
     or length(coalesce(p_notes,'')) > 400 then
    raise exception 'Invalid customer details';
  end if;

  select * into v_store from public.go_stores where slug=p_slug and enabled=true;
  if not found or v_store.pickup_branch_id is null or btrim(v_store.pickup_address)='' then
    raise exception 'Pickup is unavailable';
  end if;
  if not exists(select 1 from public.branches where id=v_store.pickup_branch_id
                and company_id=v_store.company_id and status='active') then
    raise exception 'Pickup branch is unavailable';
  end if;
  select name into v_company_name from public.companies where id=v_store.company_id and status='active';
  if v_company_name is null then raise exception 'Store is unavailable'; end if;

  -- Serialize the hourly checks per shop; avoid client-side amounts entirely.
  perform pg_advisory_xact_lock(hashtextextended('go:'||v_store.company_id::text,0));
  if (select count(*) from public.sales_orders where company_id=v_store.company_id
      and channel='go' and created_at>now()-interval '1 hour') >= 300
    or (select count(*) from public.sales_orders where company_id=v_store.company_id
      and channel='go' and customer_phone=p_phone
      and created_at>now()-interval '1 hour') >= 3 then
    raise exception 'Order limit reached. Try again later';
  end if;
  select p.user_id into v_cashier from public.user_profiles p
    join public.company_memberships m on m.company_id=p.company_id and m.user_id=p.user_id and m.status='active'
    where p.company_id=v_store.company_id and p.role='super_admin' limit 1;
  if v_cashier is null then raise exception 'Store owner unavailable'; end if;
  select coalesce(prices_include_tax,false) into v_prices_include_tax
    from public.sales_settings where company_id=v_store.company_id;
  v_prices_include_tax := coalesce(v_prices_include_tax,false);

  v_order_no := 'GO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.sales_orders(company_id,order_no,cashier_id,channel,service_type,
      status,tracking_status,customer_name,customer_phone,customer_notes,notes,pickup_branch_id)
    values(v_store.company_id,v_order_no,v_cashier,'go','takeaway',
      'held','new',btrim(p_name),p_phone,nullif(btrim(coalesce(p_notes,'')),''),
      'AVERO GO pickup - pay at collection',v_store.pickup_branch_id)
    returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' or coalesce(v_item->>'product_id','') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(v_item->>'quantity','') !~ '^[0-9]{1,2}$' then
      raise exception 'Invalid item';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 or (v_item->>'product_id')::uuid = any(v_seen) then
      raise exception 'Invalid item quantity or duplicate';
    end if;
    select * into v_product from public.sales_products p
      where p.id=(v_item->>'product_id')::uuid and p.company_id=v_store.company_id
        and p.active=true and p.show_on_go=true
        and p.product_type not in ('raw_material','sub_recipe')
        and (p.category_id is null or exists(select 1 from public.sales_categories c
          where c.id=p.category_id and c.company_id=p.company_id and c.active=true));
    if not found then raise exception 'Item unavailable'; end if;
    v_seen := array_append(v_seen,v_product.id);
    v_line_listed := round(v_product.price*v_qty,2);
    if v_product.tax_enabled and coalesce(v_product.tax_rate,0)>0 then
      if v_prices_include_tax then
        v_net := round(v_line_listed/(1+v_product.tax_rate/100),2);
        v_line_tax := v_line_listed-v_net;
      else
        v_net := v_line_listed;
        v_line_tax := round(v_net*v_product.tax_rate/100,2);
      end if;
    else
      v_net := v_line_listed;
      v_line_tax := 0;
    end if;
    insert into public.sales_order_lines(company_id,order_id,product_id,inventory_item_id,
        recipe_id,product_name,quantity,unit_price,tax_rate,tax_amount,line_total)
      values(v_store.company_id,v_order_id,v_product.id,v_product.inventory_item_id,
        v_product.recipe_id,v_product.name,v_qty,v_product.price,
        case when v_product.tax_enabled then coalesce(v_product.tax_rate,0) else 0 end,
        v_line_tax,v_net+v_line_tax);
    v_subtotal := v_subtotal+v_net;
    v_tax := v_tax+v_line_tax;
  end loop;
  update public.sales_orders set subtotal=v_subtotal,tax=v_tax,total=v_subtotal+v_tax where id=v_order_id;
  return jsonb_build_object('order_no',v_order_no,'total',v_subtotal+v_tax,'currency','SAR',
    'pickup_address',v_store.pickup_address,'branch_id',v_store.pickup_branch_id,
    'prep_minutes',v_store.prep_minutes);
end $$;
revoke all on function public.go_place_pickup_order(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.go_place_pickup_order(text,text,text,text,jsonb) to service_role;

insert into public.go_stores(company_id,slug)
select id,'fattirat-lebanon' from public.companies where name='فطيرة لبنان'
on conflict (company_id) do nothing;
