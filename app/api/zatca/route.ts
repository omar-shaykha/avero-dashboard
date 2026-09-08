// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from '@/lib/auth/authorization';

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

async function context(){
  const auth = await getAuthorizationContext();
  if(!auth?.profile?.company_id) return null;
  return { auth, companyId: auth.profile.company_id, supabase: db() };
}

function canManage(auth:any){
  return isKingAdmin(auth) || isTenantAdmin(auth) || hasPermission(auth,'sales.manage');
}

function digits(value:unknown){ return String(value ?? '').replace(/\D/g,''); }

export async function GET(){
  const x = await context();
  if(!x) return NextResponse.json({ error:'Unauthorized' },{ status:401 });

  const [settings, units, documents, warehouses] = await Promise.all([
    x.supabase.from('zatca_company_settings').select('*').eq('company_id',x.companyId).maybeSingle(),
    x.supabase.from('zatca_egs_units').select('*').eq('company_id',x.companyId).order('created_at',{ascending:false}),
    x.supabase.from('zatca_documents').select('id,order_id,egs_unit_id,uuid,invoice_number,invoice_kind,document_status,issue_at,invoice_counter,invoice_hash,submitted_at,cleared_at,warnings,errors,created_at').eq('company_id',x.companyId).order('created_at',{ascending:false}).limit(50),
    x.supabase.from('inventory_warehouses').select('id,name').eq('company_id',x.companyId).eq('active',true).order('name')
  ]);

  const error = settings.error || units.error || documents.error || warehouses.error;
  if(error) return NextResponse.json({ error:error.message },{ status:400 });

  return NextResponse.json({
    settings: settings.data || null,
    units: units.data || [],
    documents: documents.data || [],
    warehouses: warehouses.data || [],
    can_manage: canManage(x.auth)
  });
}

export async function POST(req:Request){
  const x = await context();
  if(!x) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  if(!canManage(x.auth)) return NextResponse.json({ error:'Forbidden' },{ status:403 });

  const body = await req.json().catch(()=>({}));
  const kind = String(body?.kind || '');
  const data = body?.data || {};

  if(kind === 'save_settings'){
    const vat = digits(data.vat_number);
    if(vat && vat.length !== 15) return NextResponse.json({ error:'Saudi VAT number must contain 15 digits' },{ status:400 });
    if(data.environment && !['sandbox','simulation','production'].includes(data.environment)) return NextResponse.json({ error:'Invalid ZATCA environment' },{ status:400 });
    if(data.invoice_type && !['simplified','standard','both'].includes(data.invoice_type)) return NextResponse.json({ error:'Invalid invoice type' },{ status:400 });

    const payload = {
      company_id:x.companyId,
      enabled:!!data.enabled,
      environment:data.environment || 'sandbox',
      vat_number:vat || null,
      legal_name:String(data.legal_name || '').trim() || null,
      legal_name_ar:String(data.legal_name_ar || '').trim() || null,
      tax_scheme:'VAT',
      country_code:'SA',
      city:String(data.city || '').trim() || null,
      district:String(data.district || '').trim() || null,
      street:String(data.street || '').trim() || null,
      building_number:String(data.building_number || '').trim() || null,
      additional_number:String(data.additional_number || '').trim() || null,
      postal_code:String(data.postal_code || '').trim() || null,
      address_line:String(data.address_line || '').trim() || null,
      invoice_type:data.invoice_type || 'both',
      default_vat_rate:Number.isFinite(Number(data.default_vat_rate)) ? Number(data.default_vat_rate) : 15,
      updated_at:new Date().toISOString()
    };

    const r = await x.supabase.from('zatca_company_settings').upsert(payload,{onConflict:'company_id'}).select().single();
    return r.error ? NextResponse.json({error:r.error.message},{status:400}) : NextResponse.json({record:r.data});
  }

  if(kind === 'readiness_check'){
    const r = await x.supabase.from('zatca_company_settings').select('*').eq('company_id',x.companyId).maybeSingle();
    if(r.error) return NextResponse.json({error:r.error.message},{status:400});
    const s = r.data || {};
    const required = [
      ['vat_number',s.vat_number],['legal_name',s.legal_name],['city',s.city],['street',s.street],
      ['building_number',s.building_number],['postal_code',s.postal_code]
    ];
    const missing = required.filter(([,value])=>!String(value || '').trim()).map(([key])=>key);
    const vatValid = digits(s.vat_number).length === 15;
    const units = await x.supabase.from('zatca_egs_units').select('id,status').eq('company_id',x.companyId);
    if(units.error) return NextResponse.json({error:units.error.message},{status:400});
    const ready = missing.length === 0 && vatValid && (units.data || []).length > 0;
    const status = ready ? 'configuration_ready' : 'not_started';
    await x.supabase.from('zatca_company_settings').update({onboarding_status:status,last_checked_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq('company_id',x.companyId);
    return NextResponse.json({ready,missing,vat_valid:vatValid,egs_units:(units.data || []).length,status});
  }

  if(kind === 'register_egs'){
    const name = String(data.name || '').trim();
    const serial = String(data.serial_number || '').trim();
    if(!name || !serial) return NextResponse.json({error:'Device name and serial number are required'},{status:400});
    if(data.warehouse_id){
      const w = await x.supabase.from('inventory_warehouses').select('id').eq('id',data.warehouse_id).eq('company_id',x.companyId).maybeSingle();
      if(!w.data) return NextResponse.json({error:'Invalid branch / warehouse'},{status:400});
    }
    const settings = await x.supabase.from('zatca_company_settings').select('environment').eq('company_id',x.companyId).maybeSingle();
    const environment = settings.data?.environment || 'sandbox';
    const r = await x.supabase.from('zatca_egs_units').insert({
      company_id:x.companyId,
      warehouse_id:data.warehouse_id || null,
      name,
      serial_number:serial,
      model:String(data.model || '').trim() || null,
      solution_name:'AVERO OS',
      environment,
      status:'draft'
    }).select().single();
    return r.error ? NextResponse.json({error:r.error.message},{status:400}) : NextResponse.json({record:r.data});
  }

  if(kind === 'delete_egs'){
    const id = String(data.id || '');
    const current = await x.supabase.from('zatca_egs_units').select('id,status').eq('id',id).eq('company_id',x.companyId).maybeSingle();
    if(!current.data) return NextResponse.json({error:'EGS unit not found'},{status:404});
    if(['production_ready','active'].includes(current.data.status)) return NextResponse.json({error:'Production/active EGS units must be revoked before removal'},{status:409});
    const r = await x.supabase.from('zatca_egs_units').delete().eq('id',id).eq('company_id',x.companyId);
    return r.error ? NextResponse.json({error:r.error.message},{status:400}) : NextResponse.json({ok:true});
  }

  return NextResponse.json({error:'Invalid action'},{status:400});
}
