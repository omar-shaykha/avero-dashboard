// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorizationContext,isKingAdmin,isTenantAdmin,hasPermission } from '@/lib/auth/authorization';

const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const ok=(a:any,p:string)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,p);
async function C(){const a=await getAuthorizationContext();return a?.profile?.company_id?{a,c:a.profile.company_id,s:db()}:null}
async function owned(s:any,table:string,id:string|undefined,c:string,extra:Record<string,any>={}){if(!id)return false;let q=s.from(table).select('id').eq('id',id).eq('company_id',c);for(const[k,v]of Object.entries(extra))q=q.eq(k,v);const r=await q.maybeSingle();return !!r.data}

export async function GET(){
 const x=await C();if(!x)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!ok(x.a,'production.view')&&!ok(x.a,'production.manage'))return NextResponse.json({error:'Forbidden'},{status:403});
 const q=(t:string,s='*')=>x.s.from(t).select(s).eq('company_id',x.c).order('created_at',{ascending:false});
 const[recipes,orders,items,warehouses,units,waste,versions,byproducts,locations]=await Promise.all([
  q('production_recipes','*,production_recipe_lines(*)'),
  q('production_orders','*,production_recipes(name,recipe_code,output_item_id),production_consumption(*)'),
  x.s.from('inventory_items').select('id,sku,name,item_type,base_unit_id,average_cost,track_batches,track_expiry').eq('company_id',x.c).eq('active',true).order('name'),
  x.s.from('inventory_warehouses').select('id,name').eq('company_id',x.c).eq('active',true),
  x.s.from('inventory_units').select('id,name,symbol').eq('company_id',x.c).eq('active',true),
  q('production_waste'),q('production_recipe_versions'),q('production_byproducts'),q('inventory_locations')
 ]);
 return NextResponse.json({recipes:recipes.data||[],orders:orders.data||[],items:items.data||[],warehouses:warehouses.data||[],units:units.data||[],waste:waste.data||[],versions:versions.data||[],byproducts:byproducts.data||[],locations:locations.data||[]});
}

export async function POST(req:Request){
 const x=await C();if(!x)return NextResponse.json({error:'Unauthorized'},{status:401});
 const b=await req.json(),d=b.data||{};
 if(!ok(x.a,b.kind==='complete'?'production.complete':'production.manage'))return NextResponse.json({error:'Forbidden'},{status:403});

 if(b.kind==='recipe'){
  const name=String(d.name||'').trim();
  const yieldQty=Number(d.yield_qty||1),batchSize=Number(d.batch_size||1),loss=Number(d.expected_loss_percent||0);
  if(!name)return NextResponse.json({error:'Recipe name is required'},{status:400});
  if(!Number.isFinite(yieldQty)||yieldQty<=0)return NextResponse.json({error:'Yield quantity must be greater than zero'},{status:400});
  if(!Number.isFinite(batchSize)||batchSize<=0)return NextResponse.json({error:'Batch size must be greater than zero'},{status:400});
  if(!Number.isFinite(loss)||loss<0||loss>100)return NextResponse.json({error:'Expected loss must be between 0 and 100'},{status:400});
  if(!await owned(x.s,'inventory_items',d.output_item_id,x.c,{active:true}))return NextResponse.json({error:'Invalid output inventory item'},{status:400});
  if(d.output_unit_id&&!await owned(x.s,'inventory_units',d.output_unit_id,x.c,{active:true}))return NextResponse.json({error:'Invalid output unit'},{status:400});

  const inputLines=Array.isArray(d.lines)?d.lines:[];
  for(const l of inputLines){
   const qty=Number(l.quantity),waste=Number(l.waste_percent||0);
   if(!Number.isFinite(qty)||qty<=0)return NextResponse.json({error:'Every recipe line must have a positive quantity'},{status:400});
   if(!Number.isFinite(waste)||waste<0||waste>100)return NextResponse.json({error:'Recipe line waste must be between 0 and 100'},{status:400});
   if(!l.item_id&&!l.sub_recipe_id)return NextResponse.json({error:'Recipe line must reference an inventory item or sub-recipe'},{status:400});
   if(l.item_id&&l.sub_recipe_id)return NextResponse.json({error:'Recipe line cannot reference both an item and a sub-recipe'},{status:400});
   if(l.item_id&&!await owned(x.s,'inventory_items',l.item_id,x.c,{active:true}))return NextResponse.json({error:'Invalid recipe ingredient'},{status:400});
   if(l.sub_recipe_id&&!await owned(x.s,'production_recipes',l.sub_recipe_id,x.c,{status:'active'}))return NextResponse.json({error:'Invalid sub-recipe'},{status:400});
   if(l.unit_id&&!await owned(x.s,'inventory_units',l.unit_id,x.c,{active:true}))return NextResponse.json({error:'Invalid recipe line unit'},{status:400});
  }

  const code=String(d.recipe_code||'').trim()||`RCP-${Date.now()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const r=await x.s.from('production_recipes').insert({company_id:x.c,recipe_code:code,name,output_item_id:d.output_item_id,output_unit_id:d.output_unit_id||null,yield_qty:yieldQty,batch_size:batchSize,expected_loss_percent:loss,instructions:d.instructions||null,notes:d.notes||null,created_by:x.a.user.id}).select().single();
  if(r.error)return NextResponse.json({error:r.error.message},{status:400});

  const lines=inputLines.map((l:any)=>({company_id:x.c,recipe_id:r.data.id,item_id:l.item_id||null,sub_recipe_id:l.sub_recipe_id||null,unit_id:l.unit_id||null,quantity:Number(l.quantity),waste_percent:Number(l.waste_percent||0),optional:!!l.optional,notes:l.notes||null}));
  if(lines.length){
   const e=await x.s.from('production_recipe_lines').insert(lines);
   if(e.error){await x.s.from('production_recipes').delete().eq('id',r.data.id).eq('company_id',x.c);return NextResponse.json({error:e.error.message},{status:400})}
  }
  return NextResponse.json({record:r.data});
 }

 if(b.kind==='version'){
  if(!await owned(x.s,'production_recipes',d.recipe_id,x.c))return NextResponse.json({error:'Invalid recipe'},{status:400});
  const r=await x.s.rpc('production_new_recipe_version',{p_company_id:x.c,p_recipe_id:d.recipe_id,p_notes:d.notes||null,p_actor:x.a.user.id});
  return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({version:r.data});
 }

 if(b.kind==='order'){
  const plannedQty=Number(d.planned_qty);
  if(!Number.isFinite(plannedQty)||plannedQty<=0)return NextResponse.json({error:'Planned quantity must be greater than zero'},{status:400});
  const recipe=await x.s.from('production_recipes').select('id,yield_qty').eq('id',d.recipe_id).eq('company_id',x.c).eq('status','active').maybeSingle();
  if(!recipe.data)return NextResponse.json({error:'Invalid or inactive recipe'},{status:400});
  if(!await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c,{active:true}))return NextResponse.json({error:'Invalid warehouse'},{status:400});
  if(d.location_id&&!await owned(x.s,'inventory_locations',d.location_id,x.c,{warehouse_id:d.warehouse_id,active:true}))return NextResponse.json({error:'Invalid warehouse location'},{status:400});
  if(d.expiry_date&&d.manufacture_date&&String(d.expiry_date)<String(d.manufacture_date))return NextResponse.json({error:'Expiry date cannot be before manufacture date'},{status:400});
  const r=await x.s.from('production_orders').insert({company_id:x.c,production_no:`PROD-${Date.now()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`,recipe_id:d.recipe_id,warehouse_id:d.warehouse_id,location_id:d.location_id||null,planned_qty:plannedQty,planned_date:d.planned_date||new Date().toISOString().slice(0,10),priority:d.priority||'normal',batch_no:d.batch_no||null,manufacture_date:d.manufacture_date||null,expiry_date:d.expiry_date||null,status:'planned',notes:d.notes||null,created_by:x.a.user.id}).select().single();
  return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
 }

 if(b.kind==='start'){
  const r=await x.s.from('production_orders').update({status:'in_progress',started_at:new Date().toISOString()}).eq('id',d.order_id).eq('company_id',x.c).eq('status','planned').select().maybeSingle();
  if(r.error)return NextResponse.json({error:r.error.message},{status:400});
  if(!r.data)return NextResponse.json({error:'Production order is not in planned status'},{status:409});
  return NextResponse.json({record:r.data});
 }

 if(b.kind==='complete'){
  const actualQty=Number(d.actual_qty);
  if(!Number.isFinite(actualQty)||actualQty<=0)return NextResponse.json({error:'Actual quantity must be greater than zero'},{status:400});
  const r=await x.s.rpc('production_complete_order_v2',{p_company_id:x.c,p_order_id:d.order_id,p_actual_qty:actualQty,p_consumption:Array.isArray(d.consumption)?d.consumption:[],p_waste:Array.isArray(d.waste)?d.waste:[],p_byproducts:Array.isArray(d.byproducts)?d.byproducts:[],p_actor:x.a.user.id});
  return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({result:r.data});
 }

 return NextResponse.json({error:'Invalid action'},{status:400});
}
