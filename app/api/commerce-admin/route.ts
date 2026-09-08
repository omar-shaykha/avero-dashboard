// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorizationContext,isKingAdmin,isTenantAdmin,hasPermission } from '@/lib/auth/authorization';

const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const can=(a:any,p:string)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,p);
async function C(){const a=await getAuthorizationContext();return a?.profile?.company_id?{a,c:a.profile.company_id,s:db()}:null}
async function owned(s:any,table:string,id:string|undefined,c:string){if(!id)return false;const q=await s.from(table).select('id').eq('id',id).eq('company_id',c).maybeSingle();return !!q.data}
const UNIT_MAP:any={piece:{code:'PCS',name:'Pieces',symbol:'pc',category:'count'},gram:{code:'G',name:'Gram',symbol:'g',category:'weight'},kilogram:{code:'KG',name:'Kilogram',symbol:'kg',category:'weight'},liter:{code:'L',name:'Liter',symbol:'L',category:'volume'}};
async function ensureUnit(x:any,key:string){const u=UNIT_MAP[key]||UNIT_MAP.piece;let q=await x.s.from('inventory_units').select('id').eq('company_id',x.c).eq('code',u.code).maybeSingle();if(q.data)return q.data.id;const ins=await x.s.from('inventory_units').insert({company_id:x.c,code:u.code,name:u.name,symbol:u.symbol,category:u.category,precision:key==='piece'?0:3,active:true}).select('id').single();if(ins.error)throw new Error(ins.error.message);return ins.data.id}
const TYPES=['raw_material','purchased_product','recipe_product','sub_recipe','non_stock'];
const POLICIES=['none','stock','recipe_on_sale','produced_stock'];

export async function GET(){
 const x=await C();if(!x)return NextResponse.json({error:'Unauthorized'},{status:401});
 const [customers,b2b,invoices,payments,tables,invoiceTemplate,products,categories,profiles,warehouses,suppliers,items,units,recipes]=await Promise.all([
  x.s.from('sales_customers').select('*').eq('company_id',x.c).order('created_at',{ascending:false}),
  x.s.from('b2b_accounts').select('*').eq('company_id',x.c).order('created_at',{ascending:false}),
  x.s.from('b2b_invoices').select('*,b2b_invoice_lines(*),b2b_accounts(legal_name)').eq('company_id',x.c).order('created_at',{ascending:false}),
  x.s.from('sales_payment_methods').select('*').eq('company_id',x.c).eq('active',true).order('sort_order'),
  x.s.from('sales_dining_tables').select('*').eq('company_id',x.c).order('sort_order'),
  x.s.from('sales_invoice_templates').select('*').eq('company_id',x.c).maybeSingle(),
  x.s.from('sales_products').select('*,sales_categories(name),inventory_items(id,name,sku,average_cost,item_type)').eq('company_id',x.c).eq('active',true).order('created_at',{ascending:false}),
  x.s.from('sales_categories').select('*').eq('company_id',x.c).eq('active',true).order('sort_order'),
  x.s.from('user_profiles').select('user_id,full_name,username,nickname').eq('company_id',x.c),
  x.s.from('inventory_warehouses').select('id,name,code').eq('company_id',x.c).eq('active',true).order('name'),
  x.s.from('suppliers').select('id,name,supplier_code').eq('company_id',x.c).eq('status','active').order('name'),
  x.s.from('inventory_items').select('id,name,sku,average_cost,item_type').eq('company_id',x.c).eq('active',true).order('name'),
  x.s.from('inventory_units').select('id,code,name,symbol').eq('company_id',x.c).eq('active',true).order('name'),
  x.s.from('production_recipes').select('id,name,recipe_code,recipe_type,status,output_item_id').eq('company_id',x.c).eq('status','active').order('name')
 ]);
 return NextResponse.json({customers:customers.data||[],b2b:b2b.data||[],invoices:invoices.data||[],payment_methods:payments.data||[],tables:tables.data||[],invoice_template:invoiceTemplate.data||null,products:products.data||[],categories:categories.data||[],profiles:profiles.data||[],warehouses:warehouses.data||[],suppliers:suppliers.data||[],items:items.data||[],units:units.data||[],recipes:recipes.data||[]});
}

export async function POST(req:Request){
 const x=await C();if(!x)return NextResponse.json({error:'Unauthorized'},{status:401});
 const b=await req.json(),d=b.data||{};let r:any;

 if(b.kind==='category_save'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  const name=String(d.name||'').trim();if(!name)return NextResponse.json({error:'Category name is required'},{status:400});
  const p={company_id:x.c,name,code:String(d.code||name).trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').slice(0,30)||null,description:d.description||null,sort_order:Number(d.sort_order||0),active:true};
  r=d.id?await x.s.from('sales_categories').update(p).eq('id',d.id).eq('company_id',x.c).select().single():await x.s.from('sales_categories').insert(p).select().single();
 }
 else if(b.kind==='category_delete'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  const used=await x.s.from('sales_products').select('id',{count:'exact',head:true}).eq('company_id',x.c).eq('category_id',d.id).eq('active',true);
  if((used.count||0)>0)return NextResponse.json({error:'Move products out of this category before deleting it'},{status:409});
  r=await x.s.from('sales_categories').update({active:false}).eq('id',d.id).eq('company_id',x.c).select().single();
 }
 else if(b.kind==='customer'){
  if(!can(x.a,'customers.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  if(!String(d.name||'').trim())return NextResponse.json({error:'Name required'},{status:400});
  const p={company_id:x.c,name:String(d.name).trim(),phone:d.phone||null,email:d.email||null,tax_number:d.tax_number||null,address:d.address||null,city:d.city||null,notes:d.notes||null,active:d.active!==false};
  r=d.id?await x.s.from('sales_customers').update(p).eq('id',d.id).eq('company_id',x.c).select().single():await x.s.from('sales_customers').insert({...p,customer_code:d.customer_code||`CUS-${Date.now().toString().slice(-7)}`}).select().single();
 }
 else if(b.kind==='b2b_account'){
  if(!can(x.a,'b2b.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  if(!String(d.legal_name||'').trim())return NextResponse.json({error:'Legal name required'},{status:400});
  const p={company_id:x.c,legal_name:String(d.legal_name).trim(),trade_name:d.trade_name||null,tax_number:d.tax_number||null,contact_name:d.contact_name||null,phone:d.phone||null,email:d.email||null,address:d.address||null,city:d.city||null,credit_limit:Number(d.credit_limit||0),payment_terms_days:Number(d.payment_terms_days||0),notes:d.notes||null,active:d.active!==false};
  r=d.id?await x.s.from('b2b_accounts').update(p).eq('id',d.id).eq('company_id',x.c).select().single():await x.s.from('b2b_accounts').insert({...p,account_code:d.account_code||`B2B-${Date.now().toString().slice(-7)}`}).select().single();
 }
 else if(b.kind==='b2b_invoice'){
  if(!can(x.a,'b2b.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  const a=await x.s.from('b2b_accounts').select('id,payment_terms_days').eq('id',d.account_id).eq('company_id',x.c).maybeSingle();if(!a.data)return NextResponse.json({error:'Invalid B2B account'},{status:400});
  const lines=Array.isArray(d.lines)?d.lines.filter((z:any)=>String(z.description||'').trim()&&Number(z.quantity)>0):[];if(!lines.length)return NextResponse.json({error:'Add invoice lines'},{status:400});
  let subtotal=0,tax=0;for(const z of lines){const base=Number(z.quantity)*Number(z.unit_price||0);subtotal+=base;tax+=base*Number(z.tax_rate||0)/100;}
  const inv=await x.s.from('b2b_invoices').insert({company_id:x.c,account_id:d.account_id,invoice_no:d.invoice_no||`B2B-${Date.now()}`,invoice_date:d.invoice_date||new Date().toISOString().slice(0,10),due_date:d.due_date||null,status:d.status||'issued',subtotal,tax,total:subtotal+tax,notes:d.notes||null,created_by:x.a.user.id}).select().single();if(inv.error)return NextResponse.json({error:inv.error.message},{status:400});
  const lr=await x.s.from('b2b_invoice_lines').insert(lines.map((z:any)=>{const base=Number(z.quantity)*Number(z.unit_price||0);return{company_id:x.c,invoice_id:inv.data.id,description:String(z.description).trim(),quantity:Number(z.quantity),unit_price:Number(z.unit_price||0),tax_rate:Number(z.tax_rate||0),line_total:base+base*Number(z.tax_rate||0)/100}}));if(lr.error){await x.s.from('b2b_invoices').delete().eq('id',inv.data.id);return NextResponse.json({error:lr.error.message},{status:400});}return NextResponse.json({record:inv.data});
 }
 else if(b.kind==='payment_method'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  const pct=Math.max(0,Math.min(100,Number(d.adjustment_percent||0)));const p={company_id:x.c,code:String(d.code||d.name||'pay').toLowerCase().replace(/\s+/g,'_'),name:String(d.name||'Payment'),adjustment_percent:pct,adjustment_type:d.adjustment_type==='discount'?'discount':'markup',active:d.active!==false,sort_order:Number(d.sort_order||0),updated_at:new Date().toISOString()};
  r=d.id?await x.s.from('sales_payment_methods').update(p).eq('id',d.id).eq('company_id',x.c).select().single():await x.s.from('sales_payment_methods').insert(p).select().single();
 }
 else if(b.kind==='dining_table'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});const p={company_id:x.c,name:String(d.name||'Table').trim(),area:d.area||null,seats:Math.max(1,Number(d.seats||2)),status:d.status||'open',sort_order:Number(d.sort_order||0),updated_at:new Date().toISOString()};r=d.id?await x.s.from('sales_dining_tables').update(p).eq('id',d.id).eq('company_id',x.c).select().single():await x.s.from('sales_dining_tables').insert(p).select().single();
 }
 else if(b.kind==='invoice_template'){
  if(!can(x.a,'sales.invoice.customize'))return NextResponse.json({error:'Forbidden'},{status:403});r=await x.s.from('sales_invoice_templates').upsert({company_id:x.c,business_name:d.business_name||null,logo_url:d.logo_url||null,commercial_registration:d.commercial_registration||null,vat_number:d.vat_number||null,address:d.address||null,phone:d.phone||null,header_text:d.header_text||null,footer_text:d.footer_text||null,paper_size:['roll58','roll80','a4'].includes(d.paper_size)?d.paper_size:'roll80',show_tax_number:d.show_tax_number!==false,show_cashier:d.show_cashier!==false,show_customer:d.show_customer!==false,show_item_notes:d.show_item_notes!==false,show_cr:d.show_cr!==false,show_vat:d.show_vat!==false,show_address:d.show_address!==false,show_phone:d.show_phone!==false,accent:d.accent||'#06b6d4',updated_at:new Date().toISOString()},{onConflict:'company_id'}).select().single();
 }
 else if(b.kind==='generate_product_code'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});const g=await x.s.rpc('sales_generate_code',{p_company_id:x.c,p_prefix:'PRD'});if(g.error)return NextResponse.json({error:g.error.message},{status:400});return NextResponse.json({code:g.data,barcode:g.data});
 }
 else if(b.kind==='product_save'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
  const name=String(d.name||'').trim(),price=Number(d.price),cost=Number(d.cost||0),openingQty=Number(d.opening_quantity||0),unit=['piece','gram','kilogram','liter'].includes(d.sale_unit)?d.sale_unit:'piece';
  let productType=TYPES.includes(d.product_type)?d.product_type:'non_stock';
  let policy=POLICIES.includes(d.inventory_policy)?d.inventory_policy:'none';
  if(!name)return NextResponse.json({error:'Product name is required'},{status:400});if(!Number.isFinite(price)||price<0)return NextResponse.json({error:'Price must be zero or greater'},{status:400});if(!Number.isFinite(cost)||cost<0)return NextResponse.json({error:'Cost must be zero or greater'},{status:400});if(!Number.isFinite(openingQty)||openingQty<0)return NextResponse.json({error:'Opening quantity cannot be negative'},{status:400});
  if(d.category_id&&!await owned(x.s,'sales_categories',d.category_id,x.c))return NextResponse.json({error:'Invalid sales category'},{status:400});if(d.supplier_id&&!await owned(x.s,'suppliers',d.supplier_id,x.c))return NextResponse.json({error:'Invalid supplier'},{status:400});
  if(productType==='recipe_product'){if(!d.recipe_id||!await owned(x.s,'production_recipes',d.recipe_id,x.c))return NextResponse.json({error:'Recipe Product requires a valid main recipe'},{status:400});const rq=await x.s.from('production_recipes').select('recipe_type').eq('id',d.recipe_id).eq('company_id',x.c).maybeSingle();if(rq.data?.recipe_type==='sub')return NextResponse.json({error:'Choose a main recipe, not a sub-recipe'},{status:400});if(!['recipe_on_sale','produced_stock'].includes(policy))policy='recipe_on_sale';}
  if(productType==='sub_recipe'){if(!d.sub_recipe_id||!await owned(x.s,'production_recipes',d.sub_recipe_id,x.c))return NextResponse.json({error:'Sub-Recipe product requires a valid sub-recipe'},{status:400});const rq=await x.s.from('production_recipes').select('recipe_type').eq('id',d.sub_recipe_id).eq('company_id',x.c).maybeSingle();if(rq.data?.recipe_type!=='sub')return NextResponse.json({error:'Choose a sub-recipe'},{status:400});if(!['none','produced_stock'].includes(policy))policy='none';}
  if(productType==='raw_material'){policy='stock';d.recipe_id=null;d.sub_recipe_id=null;}if(productType==='non_stock'){policy='none';d.recipe_id=null;d.sub_recipe_id=null;}if(productType==='purchased_product'){policy=d.track_inventory===false?'none':'stock';d.recipe_id=null;d.sub_recipe_id=null;}
  const track=policy==='stock'||policy==='produced_stock';const show=productType==='sub_recipe'?false:d.show_on_cashier!==false;
  if(openingQty>0&&!track)return NextResponse.json({error:'Opening quantity is only valid for inventory-tracked products'},{status:400});if(openingQty>0&&!await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c))return NextResponse.json({error:'Select a valid warehouse for opening stock'},{status:400});
  let sku=String(d.sku||'').trim().toUpperCase();if(!sku){const g=await x.s.rpc('sales_generate_code',{p_company_id:x.c,p_prefix:productType==='recipe_product'?'RCP':productType==='sub_recipe'?'SUB':'PRD'});if(g.error)return NextResponse.json({error:g.error.message},{status:400});sku=g.data;}const barcode=String(d.barcode||'').trim()||sku;
  let inventoryItemId=d.inventory_item_id||null;try{
   if(track&&!inventoryItemId){const unitId=await ensureUnit(x,unit);const itemType=productType==='raw_material'?'raw_material':productType==='sub_recipe'?'sub_recipe_output':'finished_good';const ii=await x.s.from('inventory_items').insert({company_id:x.c,sku,barcode,name,item_type:itemType,category:d.category_name||null,base_unit_id:unitId,purchase_unit_id:unitId,purchase_to_base_factor:1,tax_enabled:!!d.tax_enabled,tax_rate:d.tax_enabled?Number(d.tax_rate||0):0,costing_method:'weighted_average',standard_cost:cost,average_cost:0,last_purchase_cost:cost,min_stock:0,max_stock:0,reorder_point:0,safety_stock:0,track_batches:false,track_expiry:false,track_serials:false,allow_negative_stock:false,active:true,created_by:x.a.user.id,updated_by:x.a.user.id}).select('id').single();if(ii.error)return NextResponse.json({error:ii.error.message},{status:400});inventoryItemId=ii.data.id;}
   else if(track&&inventoryItemId&&!await owned(x.s,'inventory_items',inventoryItemId,x.c))return NextResponse.json({error:'Invalid inventory item'},{status:400});
   const accountingClass=productType==='recipe_product'||productType==='sub_recipe'?'manufactured_good':track?'inventory_asset':'non_stock';
   const payload:any={company_id:x.c,category_id:d.category_id||null,inventory_item_id:track?inventoryItemId:d.inventory_item_id||null,preferred_supplier_id:d.supplier_id||null,recipe_id:productType==='recipe_product'?d.recipe_id:null,sub_recipe_id:productType==='sub_recipe'?d.sub_recipe_id:null,product_type:productType,inventory_policy:policy,accounting_class:accountingClass,sku,barcode,name,description:d.description||null,image_url:d.image_url||null,image_path:null,sale_unit:unit,weight:null,price,tax_enabled:!!d.tax_enabled,tax_rate:d.tax_enabled?Number(d.tax_rate||0):0,track_inventory:track,show_on_cashier:show,active:true,sort_order:Number(d.sort_order||0),updated_at:new Date().toISOString()};
   let pr=d.id?await x.s.from('sales_products').update(payload).eq('id',d.id).eq('company_id',x.c).select().single():await x.s.from('sales_products').insert(payload).select().single();if(pr.error)return NextResponse.json({error:pr.error.message},{status:400});
   if(track&&inventoryItemId){const unitId=await ensureUnit(x,unit),itemType=productType==='raw_material'?'raw_material':productType==='sub_recipe'?'sub_recipe_output':'finished_good';await x.s.from('inventory_items').update({name,sku,barcode,item_type:itemType,base_unit_id:unitId,purchase_unit_id:unitId,standard_cost:cost,last_purchase_cost:cost,tax_enabled:!!d.tax_enabled,tax_rate:d.tax_enabled?Number(d.tax_rate||0):0,updated_at:new Date().toISOString(),updated_by:x.a.user.id}).eq('id',inventoryItemId).eq('company_id',x.c);
    if(d.supplier_id){const old=await x.s.from('inventory_item_suppliers').select('id').eq('company_id',x.c).eq('item_id',inventoryItemId).eq('supplier_id',d.supplier_id).maybeSingle();const sp={company_id:x.c,item_id:inventoryItemId,supplier_id:d.supplier_id,purchase_unit_id:unitId,conversion_factor:1,last_price:cost,minimum_order_qty:0,lead_time_days:0,preferred:true,active:true};if(old.data)await x.s.from('inventory_item_suppliers').update(sp).eq('id',old.data.id);else await x.s.from('inventory_item_suppliers').insert(sp);}
    if(!d.id&&openingQty>0){const mv=await x.s.rpc('inventory_apply_delta',{p_company_id:x.c,p_item_id:inventoryItemId,p_warehouse_id:d.warehouse_id,p_location_id:null,p_delta:openingQty,p_unit_cost:cost,p_movement_type:'opening_stock',p_reference_type:'product_setup',p_reference_id:pr.data.id,p_reference_no:sku,p_reason:'Opening stock from Product Master',p_created_by:x.a.user.id});if(mv.error)return NextResponse.json({error:mv.error.message},{status:400});}
   }
   return NextResponse.json({record:pr.data,inventory_item_id:inventoryItemId,logic:{product_type:productType,inventory_policy:policy,accounting_class:accountingClass}});
  }catch(e:any){return NextResponse.json({error:e.message||'Product sync failed'},{status:400});}
 }
 else if(b.kind==='product_delete'){
  if(!can(x.a,'sales.manage'))return NextResponse.json({error:'Forbidden'},{status:403});r=await x.s.from('sales_products').update({active:false,show_on_cashier:false,updated_at:new Date().toISOString()}).eq('id',d.id).eq('company_id',x.c).select().single();
 }
 else return NextResponse.json({error:'Invalid action'},{status:400});
 return r?.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r?.data});
}
