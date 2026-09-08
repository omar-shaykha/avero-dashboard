// @ts-nocheck
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {getAuthorizationContext,isKingAdmin,isTenantAdmin,hasPermission} from "@/lib/auth/authorization";

const admin=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
async function ctx(){const a=await getAuthorizationContext();return a?.profile?.company_id?{a,c:a.profile.company_id,s:admin()}:null}
const can=(a:any,p:string)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,p);
async function owned(s:any,table:string,id:string|undefined,c:string,extra:Record<string,any>={}){if(!id)return false;let q=s.from(table).select('id').eq('id',id).eq('company_id',c);for(const[k,v]of Object.entries(extra))q=q.eq(k,v);const r=await q.maybeSingle();return !!r.data}

export async function GET(){
 const x=await ctx();if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!['purchasing.view','purchasing.manage','purchasing.approve','purchasing.receive','purchasing.pay'].some(p=>can(x.a,p)))return NextResponse.json({error:"Forbidden"},{status:403});
 const q=(t:string,s="*")=>x.s.from(t).select(s).eq("company_id",x.c).order("created_at",{ascending:false}).limit(100);
 const z=await Promise.all([
  x.s.from("suppliers").select("id,name,supplier_code,currency,payment_terms_days").eq("company_id",x.c).eq("status","active").order("name"),
  x.s.from("inventory_items").select("id,sku,name,purchase_unit_id,last_purchase_cost,tax_rate,purchasable").eq("company_id",x.c).eq("active",true).eq("purchasable",true).order("name"),
  x.s.from("inventory_warehouses").select("id,code,name").eq("company_id",x.c).eq("active",true).order("name"),
  q("purchase_orders","*,suppliers(name),inventory_warehouses(name),purchase_order_lines(*)"),q("purchase_receipts","*,purchase_receipt_lines(*)"),q("supplier_invoices"),q("purchase_requests","*,purchase_request_lines(*)"),q("purchase_rfqs"),q("purchase_quotes","*,suppliers(name),purchase_quote_lines(*)"),q("supplier_payments"),q("supplier_credit_notes","*,supplier_credit_note_lines(*)"),q("purchase_approval_rules")
 ]);
 const[k1,k2,k3,k4,k5,k6,k7,k8,k9,k10,k11,k12]=z;
 return NextResponse.json({suppliers:k1.data||[],items:k2.data||[],warehouses:k3.data||[],purchase_orders:k4.data||[],receipts:k5.data||[],invoices:k6.data||[],requests:k7.data||[],rfqs:k8.data||[],quotes:k9.data||[],payments:k10.data||[],credits:k11.data||[],approval_rules:k12.data||[]});
}

export async function POST(req:Request){
 const x=await ctx();if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
 const b=await req.json(),d=b.data||{};
 const required:Record<string,string>={
  purchase_request:'purchasing.manage',purchase_order:'purchasing.manage',create_rfq:'purchasing.manage',submit_quote:'purchasing.manage',supplier_invoice:'purchasing.manage',approval_rule:'purchasing.manage',three_way_match:'purchasing.manage',
  approve_request:'purchasing.approve',select_quote:'purchasing.approve',
  receive_po:'purchasing.receive',supplier_return:'purchasing.receive',
  pay_invoice:'purchasing.pay'
 };
 const perm=required[b.kind];
 if(!perm)return NextResponse.json({error:'Invalid purchasing action'},{status:400});
 if(!can(x.a,perm))return NextResponse.json({error:"Forbidden"},{status:403});

 let r:any;
 const rpc=async(n:string,p:any)=>x.s.rpc(n,p);

 if(b.kind==='purchase_request'){
  if(d.warehouse_id&&!await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c,{active:true}))return NextResponse.json({error:'Invalid warehouse'},{status:400});
  r=await rpc('purchasing_create_request',{p_company_id:x.c,p_warehouse_id:d.warehouse_id||null,p_needed_by:d.needed_by||null,p_priority:d.priority||'normal',p_department:d.department||null,p_reason:d.reason||null,p_notes:d.notes||null,p_lines:Array.isArray(d.lines)?d.lines:[],p_created_by:x.a.user.id});
 }else if(b.kind==='approve_request'){
  if(!await owned(x.s,'purchase_requests',d.request_id,x.c))return NextResponse.json({error:'Invalid purchase request'},{status:400});
  r=await rpc('purchasing_approve_request',{p_company_id:x.c,p_request_id:d.request_id,p_actor:x.a.user.id,p_approve:!!d.approve,p_comment:d.comment||null});
 }else if(b.kind==='purchase_order'){
  if(!await owned(x.s,'suppliers',d.supplier_id,x.c,{status:'active'}))return NextResponse.json({error:'Invalid supplier'},{status:400});
  if(!await owned(x.s,'inventory_warehouses',d.warehouse_id,x.c,{active:true}))return NextResponse.json({error:'Invalid warehouse'},{status:400});
  const terms=Number(d.payment_terms_days||0);if(!Number.isFinite(terms)||terms<0)return NextResponse.json({error:'Invalid payment terms'},{status:400});
  r=await rpc('purchasing_create_po',{p_company_id:x.c,p_supplier_id:d.supplier_id,p_warehouse_id:d.warehouse_id,p_expected_date:d.expected_date||null,p_currency:d.currency||'SAR',p_payment_terms_days:terms,p_notes:d.notes||null,p_lines:Array.isArray(d.lines)?d.lines:[],p_created_by:x.a.user.id});
 }else if(b.kind==='receive_po'){
  if(!await owned(x.s,'purchase_orders',d.po_id,x.c))return NextResponse.json({error:'Invalid purchase order'},{status:400});
  r=await rpc('purchasing_receive_po',{p_company_id:x.c,p_po_id:d.po_id,p_lines:Array.isArray(d.lines)?d.lines:[],p_received_by:x.a.user.id,p_delivery_note:d.delivery_note||null});
 }else if(b.kind==='pay_invoice'){
  if(!await owned(x.s,'supplier_invoices',d.invoice_id,x.c))return NextResponse.json({error:'Invalid supplier invoice'},{status:400});
  const amount=Number(d.amount||0);if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:'Payment amount must be greater than zero'},{status:400});
  r=await rpc('purchasing_pay_invoice',{p_company_id:x.c,p_invoice_id:d.invoice_id,p_amount:amount,p_method:d.payment_method||'bank_transfer',p_reference:d.reference_no||null,p_notes:d.notes||null,p_actor:x.a.user.id});
 }else if(b.kind==='create_rfq'){
  if(!await owned(x.s,'purchase_requests',d.request_id,x.c))return NextResponse.json({error:'Invalid purchase request'},{status:400});
  for(const supplierId of Array.isArray(d.supplier_ids)?d.supplier_ids:[])if(!await owned(x.s,'suppliers',supplierId,x.c,{status:'active'}))return NextResponse.json({error:'Invalid RFQ supplier'},{status:400});
  r=await rpc('purchasing_create_rfq',{p_company_id:x.c,p_request_id:d.request_id,p_quote_deadline:d.quote_deadline||null,p_supplier_ids:Array.isArray(d.supplier_ids)?d.supplier_ids:[],p_actor:x.a.user.id});
 }else if(b.kind==='submit_quote'){
  if(!await owned(x.s,'purchase_quotes',d.quote_id,x.c))return NextResponse.json({error:'Invalid quote'},{status:400});
  const delivery=Number(d.delivery_days||0),terms=Number(d.payment_terms_days||0),freight=Number(d.freight||0);
  if([delivery,terms,freight].some(v=>!Number.isFinite(v)||v<0))return NextResponse.json({error:'Invalid quote values'},{status:400});
  r=await rpc('purchasing_submit_quote',{p_company_id:x.c,p_quote_id:d.quote_id,p_quote_no:d.quote_no||null,p_valid_until:d.valid_until||null,p_delivery_days:delivery,p_payment_terms:terms,p_freight:freight,p_lines:Array.isArray(d.lines)?d.lines:[]});
 }else if(b.kind==='select_quote'){
  if(!await owned(x.s,'purchase_quotes',d.quote_id,x.c))return NextResponse.json({error:'Invalid quote'},{status:400});
  r=await rpc('purchasing_select_quote',{p_company_id:x.c,p_quote_id:d.quote_id,p_actor:x.a.user.id});
 }else if(b.kind==='supplier_return'){
  if(!await owned(x.s,'purchase_receipts',d.receipt_id,x.c))return NextResponse.json({error:'Invalid receipt'},{status:400});
  r=await rpc('purchasing_return_to_supplier',{p_company_id:x.c,p_receipt_id:d.receipt_id,p_lines:Array.isArray(d.lines)?d.lines:[],p_reason:d.reason||null,p_actor:x.a.user.id});
 }else if(b.kind==='three_way_match'){
  if(!await owned(x.s,'supplier_invoices',d.invoice_id,x.c))return NextResponse.json({error:'Invalid supplier invoice'},{status:400});
  r=await rpc('purchasing_three_way_match',{p_company_id:x.c,p_invoice_id:d.invoice_id});
 }else if(b.kind==='approval_rule'){
  const min=Number(d.min_amount||0),max=d.max_amount===null||d.max_amount===undefined||d.max_amount===''?null:Number(d.max_amount),level=Number(d.approval_level||1);
  if(!Number.isFinite(min)||min<0||max!==null&&(!Number.isFinite(max)||max<min)||!Number.isFinite(level)||level<1)return NextResponse.json({error:'Invalid approval rule values'},{status:400});
  r=await x.s.from('purchase_approval_rules').insert({company_id:x.c,rule_name:String(d.rule_name||'Approval Rule').trim(),min_amount:min,max_amount:max,required_role:d.required_role||'admin',approval_level:level,active:true}).select().single();
 }else if(b.kind==='supplier_invoice'){
  if(!await owned(x.s,'suppliers',d.supplier_id,x.c))return NextResponse.json({error:'Invalid supplier'},{status:400});
  if(d.po_id&&!await owned(x.s,'purchase_orders',d.po_id,x.c))return NextResponse.json({error:'Invalid purchase order'},{status:400});
  if(!String(d.invoice_no||'').trim())return NextResponse.json({error:'Invoice number is required'},{status:400});
  const subtotal=Number(d.subtotal??d.total??0),tax=Number(d.tax||0),freight=Number(d.freight||0),total=Number(d.total||0);
  if([subtotal,tax,freight,total].some(v=>!Number.isFinite(v)||v<0))return NextResponse.json({error:'Invoice amounts cannot be negative'},{status:400});
  const ins=await x.s.from('supplier_invoices').insert({company_id:x.c,supplier_id:d.supplier_id,po_id:d.po_id||null,invoice_no:String(d.invoice_no).trim(),invoice_date:d.invoice_date||new Date().toISOString().slice(0,10),due_date:d.due_date||null,currency:d.currency||'SAR',subtotal,tax,freight,total,status:'unpaid',match_status:'pending',notes:d.notes||null,created_by:x.a.user.id}).select().single();
  if(ins.error)return NextResponse.json({error:ins.error.message},{status:400});
  const tx=await x.s.from('supplier_transactions').insert({company_id:x.c,supplier_id:d.supplier_id,transaction_type:'invoice',reference_no:String(d.invoice_no).trim(),transaction_date:d.invoice_date||new Date().toISOString().slice(0,10),due_date:d.due_date||null,amount:total,paid_amount:0,currency:d.currency||'SAR'});
  if(tx.error){await x.s.from('supplier_invoices').delete().eq('id',ins.data.id).eq('company_id',x.c);return NextResponse.json({error:tx.error.message},{status:400});}
  await rpc('purchasing_three_way_match',{p_company_id:x.c,p_invoice_id:ins.data.id});
  return NextResponse.json({record:ins.data});
 }

 if(r.error)return NextResponse.json({error:r.error.message},{status:400});
 return NextResponse.json({result:r.data});
}
