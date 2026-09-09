// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from '@/lib/auth/authorization';

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const can = (a:any,p:string) => isKingAdmin(a) || isTenantAdmin(a) || hasPermission(a,p);
async function C(){ const a=await getAuthorizationContext(); return a?.profile?.company_id ? {a,c:a.profile.company_id,s:db()} : null; }
async function owned(s:any,table:string,id:string|undefined,c:string){ if(!id)return true; const r=await s.from(table).select('id').eq('id',id).eq('company_id',c).maybeSingle(); return !!r.data; }
async function upsertCustomer(x:any, customer:any){
  const name=String(customer?.name||'').trim(),phone=String(customer?.phone||'').trim(),email=String(customer?.email||'').trim(),notes=String(customer?.notes||'').trim();
  if(!name&&!phone)return null;
  if(phone){
    const existing=await x.s.from('sales_customers').select('id').eq('company_id',x.c).eq('phone',phone).maybeSingle();
    if(existing.data){
      await x.s.from('sales_customers').update({name:name||phone,email:email||null,notes:notes||null,active:true}).eq('id',existing.data.id).eq('company_id',x.c);
      return existing.data.id;
    }
  }
  const ins=await x.s.from('sales_customers').insert({company_id:x.c,customer_code:`CUS-${Date.now().toString().slice(-7)}`,name:name||phone,phone:phone||null,email:email||null,notes:notes||null,active:true}).select('id').single();
  return ins.data?.id||null;
}

export async function GET(){
  const x=await C(); if(!x)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!can(x.a,'sales.view')&&!can(x.a,'sales.cashier'))return NextResponse.json({error:'Forbidden'},{status:403});
  const showCost=can(x.a,'sales.cost.view')||can(x.a,'inventory.cost.view');
  const [products,categories,orders,settings,warehouses,items,recipes,shifts]=await Promise.all([
    x.s.from('sales_products').select('*,sales_categories(name),sales_product_modifiers(*)').eq('company_id',x.c).eq('active',true).neq('product_type','raw_material').neq('product_type','sub_recipe').order('sort_order'),
    x.s.from('sales_categories').select('*').eq('company_id',x.c).eq('active',true).eq('show_on_cashier',true).order('sort_order'),
    x.s.from('sales_orders').select('*,sales_order_lines(*),sales_payments(*)').eq('company_id',x.c).order('created_at',{ascending:false}).limit(150),
    x.s.from('sales_settings').select('*').eq('company_id',x.c).maybeSingle(),
    x.s.from('inventory_warehouses').select('id,name').eq('company_id',x.c).eq('active',true),
    x.s.from('inventory_items').select(showCost?'id,name,sku,average_cost':'id,name,sku').eq('company_id',x.c).eq('active',true),
    x.s.from('production_recipes').select('id,name,recipe_code,output_item_id,yield_qty,status').eq('company_id',x.c).eq('status','active'),
    x.s.from('sales_shifts').select('*').eq('company_id',x.c).eq('user_id',x.a.user.id).order('created_at',{ascending:false}).limit(30)
  ]);
  return NextResponse.json({products:products.data||[],categories:categories.data||[],orders:orders.data||[],settings:settings.data||null,warehouses:warehouses.data||[],items:items.data||[],recipes:recipes.data||[],shifts:shifts.data||[]});
}

export async function POST(req:Request){
  const x=await C(); if(!x)return NextResponse.json({error:'Unauthorized'},{status:401});
  const b=await req.json(), d=b.data||{};

  if(b.kind==='generate_code'){
    if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
    const r=await x.s.rpc('sales_generate_code',{p_company_id:x.c,p_prefix:d.prefix||'PRD'});
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({code:r.data});
  }
  if(b.kind==='category'){
    if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
    if(!String(d.name||'').trim())return NextResponse.json({error:'Category name is required'},{status:400});
    const r=await x.s.from('sales_categories').insert({company_id:x.c,name:String(d.name).trim(),code:d.code||null,description:d.description||null,sort_order:Number(d.sort_order||0),show_on_cashier:true}).select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }
  if(b.kind==='product'){
    if(!can(x.a,'sales.manage')&&!can(x.a,'production.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
    if(!String(d.name||'').trim())return NextResponse.json({error:'Product name is required'},{status:400});
    const price=Number(d.price||0), taxRate=Number(d.tax_rate||0);
    if(!Number.isFinite(price)||price<0)return NextResponse.json({error:'Invalid price'},{status:400});
    if(d.tax_enabled&&(!Number.isFinite(taxRate)||taxRate<0||taxRate>100))return NextResponse.json({error:'Tax rate must be between 0 and 100'},{status:400});
    if(d.category_id && !await owned(x.s,'sales_categories',d.category_id,x.c))return NextResponse.json({error:'Invalid category'},{status:400});
    if(d.inventory_item_id && !await owned(x.s,'inventory_items',d.inventory_item_id,x.c))return NextResponse.json({error:'Invalid inventory item'},{status:400});
    if(d.recipe_id && !await owned(x.s,'production_recipes',d.recipe_id,x.c))return NextResponse.json({error:'Invalid recipe'},{status:400});
    let sku=String(d.sku||'').trim();
    if(!sku){ const g=await x.s.rpc('sales_generate_code',{p_company_id:x.c,p_prefix:d.recipe_id?'RCP':'PRD'}); if(g.error)return NextResponse.json({error:g.error.message},{status:400}); sku=g.data; }
    const barcode=String(d.barcode||sku).trim();
    const r=await x.s.from('sales_products').insert({company_id:x.c,category_id:d.category_id||null,inventory_item_id:d.inventory_item_id||null,recipe_id:d.recipe_id||null,sku,barcode,name:String(d.name).trim(),description:d.description||null,image_url:d.image_url||null,image_path:d.image_path||null,sale_unit:d.sale_unit||'piece',weight:d.weight?Number(d.weight):null,price,tax_enabled:!!d.tax_enabled,tax_rate:d.tax_enabled?taxRate:0,track_inventory:!!d.track_inventory,show_on_cashier:d.show_on_cashier!==false,active:true,sort_order:Number(d.sort_order||0)}).select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }
  if(b.kind==='settings'){
    if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
    if(d.default_warehouse_id && !await owned(x.s,'inventory_warehouses',d.default_warehouse_id,x.c))return NextResponse.json({error:'Invalid warehouse'},{status:400});
    const mode=d.cashier_mode==='hospitality'?'hospitality':'retail';
    const r=await x.s.from('sales_settings').upsert({company_id:x.c,cashier_mode:mode,default_warehouse_id:d.default_warehouse_id||null,currency:d.currency||'SAR',prices_include_tax:!!d.prices_include_tax,allow_discount:d.allow_discount!==false,allow_negative_sale:!!d.allow_negative_sale,auto_print_receipt:!!d.auto_print_receipt}).select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }
  if(b.kind==='open_shift'){
    if(!can(x.a,'sales.cashier'))return NextResponse.json({error:'Forbidden'},{status:403});
    if(!d.warehouse_id || !await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c))return NextResponse.json({error:'Valid warehouse is required'},{status:400});
    const openingCash=Number(d.opening_cash||0);if(!Number.isFinite(openingCash)||openingCash<0)return NextResponse.json({error:'Invalid opening cash'},{status:400});
    const existing=await x.s.from('sales_shifts').select('*').eq('company_id',x.c).eq('user_id',x.a.user.id).eq('status','open').maybeSingle();if(existing.data)return NextResponse.json({record:existing.data});
    const r=await x.s.from('sales_shifts').insert({company_id:x.c,user_id:x.a.user.id,warehouse_id:d.warehouse_id,opening_cash:openingCash,status:'open'}).select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }
  if(b.kind==='close_shift'){
    if(!can(x.a,'sales.cashier'))return NextResponse.json({error:'Forbidden'},{status:403});
    const shift=await x.s.from('sales_shifts').select('*').eq('id',d.shift_id).eq('company_id',x.c).eq('user_id',x.a.user.id).eq('status','open').maybeSingle();if(!shift.data)return NextResponse.json({error:'Open shift not found'},{status:404});
    const closingCash=Number(d.closing_cash||0);if(!Number.isFinite(closingCash)||closingCash<0)return NextResponse.json({error:'Invalid closing cash'},{status:400});
    const orderRows=await x.s.from('sales_orders').select('id').eq('company_id',x.c).eq('shift_id',d.shift_id).eq('status','completed');const orderIds=(orderRows.data||[]).map((o:any)=>o.id);let cashSales=0,cashRefunds=0;
    if(orderIds.length){const payRows=await x.s.from('sales_payments').select('amount,payment_method').eq('company_id',x.c).in('order_id',orderIds);cashSales=(payRows.data||[]).filter((p:any)=>String(p.payment_method).toLowerCase()==='cash').reduce((a:number,p:any)=>a+Number(p.amount||0),0);const refundRows=await x.s.from('sales_refunds').select('amount,payment_method').eq('company_id',x.c).in('order_id',orderIds);cashRefunds=(refundRows.data||[]).filter((p:any)=>String(p.payment_method).toLowerCase()==='cash').reduce((a:number,p:any)=>a+Number(p.amount||0),0);}
    const expectedCash=Number(shift.data.opening_cash||0)+cashSales-cashRefunds;const r=await x.s.from('sales_shifts').update({status:'closed',closed_at:new Date().toISOString(),closing_cash:closingCash,expected_cash:expectedCash}).eq('id',d.shift_id).eq('company_id',x.c).eq('user_id',x.a.user.id).eq('status','open').select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data,variance:closingCash-expectedCash});
  }
  if(b.kind==='hold'){
    if(!can(x.a,'sales.cashier'))return NextResponse.json({error:'Forbidden'},{status:403});
    if(!Array.isArray(d.lines)||!d.lines.length)return NextResponse.json({error:'Cart is empty'},{status:400});
    if(!d.warehouse_id || !await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c))return NextResponse.json({error:'Invalid warehouse'},{status:400});
    const ids=d.lines.map((z:any)=>z.product_id);const pr=await x.s.from('sales_products').select('id,name,price,tax_enabled,tax_rate,inventory_item_id,recipe_id').eq('company_id',x.c).eq('active',true).in('id',ids);if(pr.error||pr.data.length!==new Set(ids).size)return NextResponse.json({error:'Invalid product in cart'},{status:400});
    const settings=await x.s.from('sales_settings').select('prices_include_tax,allow_discount').eq('company_id',x.c).maybeSingle();const pricesIncludeTax=!!settings.data?.prices_include_tax;const map=new Map(pr.data.map((p:any)=>[p.id,p]));let subtotal=0;const prepared=[] as any[];
    for(const z of d.lines){const p:any=map.get(z.product_id),q=Number(z.quantity||0),ld=Math.max(0,Number(z.discount||0));if(!Number.isFinite(q)||q<=0)return NextResponse.json({error:'Invalid quantity'},{status:400});if(!Number.isFinite(ld)||ld>Number(p.price)*q)return NextResponse.json({error:'Invalid line discount'},{status:400});const listed=Number(p.price)*q-ld,rate=p.tax_enabled?Math.max(0,Number(p.tax_rate||0)):0,net=pricesIncludeTax&&rate>0?listed/(1+rate/100):listed;subtotal+=net;prepared.push({p,q,ld,rate,net,notes:String(z.notes||'').trim()||null});}
    const requestedDiscount=Math.max(0,Number(d.discount||0));if(requestedDiscount>0&&settings.data?.allow_discount===false)return NextResponse.json({error:'Discounts are disabled in Cashier settings'},{status:403});if(requestedDiscount>0&&!can(x.a,'sales.discount'))return NextResponse.json({error:'Discount permission required'},{status:403});const discount=Math.min(subtotal,requestedDiscount),ratio=subtotal>0?discount/subtotal:0;let tax=0;
    const lines=prepared.map(({p,q,ld,rate,net,notes}:any)=>{const tx=rate>0?net*(1-ratio)*rate/100:0;tax+=tx;return{company_id:x.c,product_id:p.id,inventory_item_id:p.inventory_item_id,recipe_id:p.recipe_id,product_name:p.name,quantity:q,unit_price:Number(p.price),discount:ld,tax_rate:rate,tax_amount:tx,line_total:net+tx,unit_cost:0,total_cost:0,notes};});
    const no='H-'+Date.now().toString(36).toUpperCase();const customerId=await upsertCustomer(x,d.customer);const or=await x.s.from('sales_orders').insert({company_id:x.c,order_no:no,shift_id:d.shift_id||null,cashier_id:x.a.user.id,warehouse_id:d.warehouse_id,customer_id:customerId,service_type:d.service_type||'retail',table_no:d.table_no||null,status:'held',subtotal,discount,tax,total:Math.max(0,subtotal-discount+tax),customer_name:d.customer?.name||null,customer_phone:d.customer?.phone||null,customer_email:d.customer?.email||null,customer_notes:d.customer?.notes||null,discount_percent:Number(d.discount_percent||0),notes:d.notes||null}).select().single();if(or.error)return NextResponse.json({error:or.error.message},{status:400});
    const lr=await x.s.from('sales_order_lines').insert(lines.map((l:any)=>({...l,order_id:or.data.id})));if(lr.error){await x.s.from('sales_orders').delete().eq('id',or.data.id).eq('company_id',x.c);return NextResponse.json({error:lr.error.message},{status:400});}return NextResponse.json({record:or.data});
  }
  if(b.kind==='cancel_hold'){
    if(!can(x.a,'sales.cashier'))return NextResponse.json({error:'Forbidden'},{status:403});const h=await x.s.from('sales_orders').select('id').eq('id',d.order_id).eq('company_id',x.c).eq('status','held').maybeSingle();if(!h.data)return NextResponse.json({error:'Held order not found'},{status:404});await x.s.from('sales_order_lines').delete().eq('order_id',d.order_id).eq('company_id',x.c);await x.s.from('sales_orders').delete().eq('id',d.order_id).eq('company_id',x.c);return NextResponse.json({ok:true});
  }
  if(b.kind==='checkout'){
    if(!can(x.a,'sales.cashier'))return NextResponse.json({error:'Forbidden'},{status:403});if(!d.warehouse_id||!await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c))return NextResponse.json({error:'Invalid warehouse'},{status:400});if(!d.shift_id)return NextResponse.json({error:'Open a shift before checkout'},{status:400});const sh=await x.s.from('sales_shifts').select('id,warehouse_id').eq('id',d.shift_id).eq('company_id',x.c).eq('user_id',x.a.user.id).eq('status','open').maybeSingle();if(!sh.data)return NextResponse.json({error:'Shift is not open for this cashier'},{status:400});if(sh.data.warehouse_id&&sh.data.warehouse_id!==d.warehouse_id)return NextResponse.json({error:'Sale warehouse must match the open shift warehouse'},{status:400});
    const discount=Number(d.discount||0);if(!Number.isFinite(discount)||discount<0)return NextResponse.json({error:'Invalid discount'},{status:400});if(discount>0){const settings=await x.s.from('sales_settings').select('allow_discount').eq('company_id',x.c).maybeSingle();if(settings.data?.allow_discount===false)return NextResponse.json({error:'Discounts are disabled in Cashier settings'},{status:403});if(!can(x.a,'sales.discount'))return NextResponse.json({error:'Discount permission required'},{status:403});}
    const requestedPayment=(Array.isArray(d.payments)?d.payments:[])[0];
    if(!requestedPayment?.payment_method)return NextResponse.json({error:'Payment method is required'},{status:400});
    const pm=await x.s.from('sales_payment_methods').select('code,name,adjustment_percent,adjustment_type').eq('company_id',x.c).eq('active',true).eq('code',String(requestedPayment.payment_method).toLowerCase()).maybeSingle();
    if(!pm.data)return NextResponse.json({error:'Invalid or inactive payment method'},{status:400});
    const pct=Math.max(0,Number(pm.data.adjustment_percent||0));const sign=pm.data.adjustment_type==='discount'?-1:1;const multiplier=Math.max(0.01,1+(sign*pct/100));
    const pricedLines=(Array.isArray(d.lines)?d.lines:[]).map((line:any)=>({...line,price_multiplier:multiplier}));
    const safePayments=[{payment_method:pm.data.code,base_amount:Number(requestedPayment.base_amount??requestedPayment.amount??0),amount:Number(requestedPayment.amount??requestedPayment.base_amount??0),adjustment_percent:0,adjustment_type:'markup'}];
    const r=await x.s.rpc('sales_checkout',{p_company_id:x.c,p_cashier:x.a.user.id,p_shift_id:d.shift_id,p_warehouse_id:d.warehouse_id,p_service_type:d.service_type||'retail',p_table_no:d.table_no||null,p_discount:discount,p_lines:pricedLines,p_payments:safePayments,p_notes:d.notes||null});if(r.error)return NextResponse.json({error:r.error.message},{status:400});
    const oid=r.data?.order_id;
    if(oid){
      const customerId=await upsertCustomer(x,d.customer);
      await x.s.from('sales_orders').update({customer_id:customerId,customer_name:d.customer?.name||null,customer_phone:d.customer?.phone||null,customer_email:d.customer?.email||null,customer_notes:d.customer?.notes||null,discount_percent:Number(d.discount_percent||0)}).eq('id',oid).eq('company_id',x.c);
      for(const line of Array.isArray(d.lines)?d.lines:[]){const notes=String(line.notes||'').trim();if(notes)await x.s.from('sales_order_lines').update({notes}).eq('order_id',oid).eq('product_id',line.product_id).eq('company_id',x.c);}
    }
    if(d.held_order_id){await x.s.from('sales_order_lines').delete().eq('order_id',d.held_order_id).eq('company_id',x.c);await x.s.from('sales_orders').delete().eq('id',d.held_order_id).eq('company_id',x.c).eq('status','held');}
    return NextResponse.json({result:r.data});
  }
  return NextResponse.json({error:'Invalid action'},{status:400});
}
