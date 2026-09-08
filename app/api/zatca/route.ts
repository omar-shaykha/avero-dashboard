// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from '@/lib/auth/authorization';
import { generateZatcaSoftwareCsr, pemBody, zatcaInvoiceTypeCode } from '@/lib/zatca/crypto';

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

async function context(){
  const auth = await getAuthorizationContext();
  if(!auth?.profile?.company_id) return null;
  return { auth, companyId: auth.profile.company_id, supabase: db() };
}

function canManage(auth:any){
  return isKingAdmin(auth) || isTenantAdmin(auth) || hasPermission(auth,'zatca.manage') || hasPermission(auth,'apps.manage');
}
function digits(value:unknown){ return String(value ?? '').replace(/\D/g,''); }
function vatValid(value:unknown){ return /^3\d{13}3$/.test(digits(value)); }
function clean(value:unknown){ return String(value ?? '').trim(); }
function zatcaBaseUrl(environment:string){
  return environment === 'production'
    ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core'
    : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation';
}
function registeredAddress(s:any){
  return clean(s.address_line) || [s.building_number,s.street,s.district,s.city,s.postal_code].map(clean).filter(Boolean).join(', ');
}
async function vaultUpsert(supabase:any, secretId:string|null|undefined, secret:string, name:string, description:string){
  const r = await supabase.rpc('zatca_vault_upsert_secret',{
    p_secret_id:secretId || null,
    p_secret:secret,
    p_name:name,
    p_description:description,
  });
  if(r.error) throw new Error(r.error.message);
  return r.data as string;
}
async function parseResponse(r:Response){
  const text = await r.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw:text }; }
}

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

  const safeUnits = (units.data || []).map((u:any)=>({
    id:u.id, company_id:u.company_id, warehouse_id:u.warehouse_id, name:u.name,
    serial_number:u.serial_number, solution_name:u.solution_name, model:u.model,
    environment:u.environment, status:u.status, common_name:u.common_name,
    registered_address:u.registered_address, business_category:u.business_category,
    invoice_type_code:u.invoice_type_code, key_provider:u.key_provider,
    certificate_request_id:u.certificate_request_id, compliance_request_id:u.compliance_request_id,
    production_request_id:u.production_request_id, certificate_expires_at:u.certificate_expires_at,
    csr_generated_at:u.csr_generated_at, compliance_issued_at:u.compliance_issued_at,
    production_issued_at:u.production_issued_at, last_error:u.last_error,
    has_csr:!!u.csr_pem,
    has_private_key:!!u.private_key_vault_id,
    has_compliance_csid:!!u.compliance_csid_vault_id && !!u.compliance_secret_vault_id,
    has_production_csid:!!u.production_csid_vault_id && !!u.production_secret_vault_id,
    created_at:u.created_at, updated_at:u.updated_at,
  }));

  return NextResponse.json({
    settings: settings.data || null,
    units: safeUnits,
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
    if(vat && !vatValid(vat)) return NextResponse.json({ error:'Saudi VAT number must be 15 digits, start with 3 and end with 3' },{ status:400 });
    if(data.environment && !['sandbox','simulation','production'].includes(data.environment)) return NextResponse.json({ error:'Invalid ZATCA environment' },{ status:400 });
    if(data.invoice_type && !['simplified','standard','both'].includes(data.invoice_type)) return NextResponse.json({ error:'Invalid invoice type' },{ status:400 });

    const payload = {
      company_id:x.companyId,
      enabled:!!data.enabled,
      environment:data.environment || 'sandbox',
      vat_number:vat || null,
      legal_name:clean(data.legal_name) || null,
      legal_name_ar:clean(data.legal_name_ar) || null,
      tax_scheme:'VAT',
      country_code:'SA',
      city:clean(data.city) || null,
      district:clean(data.district) || null,
      street:clean(data.street) || null,
      building_number:clean(data.building_number) || null,
      additional_number:clean(data.additional_number) || null,
      postal_code:clean(data.postal_code) || null,
      address_line:clean(data.address_line) || null,
      industry:clean(data.industry) || null,
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
      ['building_number',s.building_number],['postal_code',s.postal_code],['industry',s.industry]
    ];
    const missing = required.filter(([,value])=>!clean(value)).map(([key])=>key);
    const validVat = vatValid(s.vat_number);
    const units = await x.supabase.from('zatca_egs_units').select('id,status').eq('company_id',x.companyId);
    if(units.error) return NextResponse.json({error:units.error.message},{status:400});
    const ready = missing.length === 0 && validVat && (units.data || []).length > 0;
    const status = ready ? 'configuration_ready' : 'not_started';
    await x.supabase.from('zatca_company_settings').update({onboarding_status:status,last_checked_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq('company_id',x.companyId);
    return NextResponse.json({ready,missing,vat_valid:validVat,egs_units:(units.data || []).length,status});
  }

  if(kind === 'register_egs'){
    const name = clean(data.name);
    const serial = clean(data.serial_number);
    if(!name || !serial) return NextResponse.json({error:'Device name and serial number are required'},{status:400});
    if(data.warehouse_id){
      const w = await x.supabase.from('inventory_warehouses').select('id').eq('id',data.warehouse_id).eq('company_id',x.companyId).maybeSingle();
      if(!w.data) return NextResponse.json({error:'Invalid branch / warehouse'},{status:400});
    }
    const settings = await x.supabase.from('zatca_company_settings').select('*').eq('company_id',x.companyId).maybeSingle();
    const environment = settings.data?.environment || 'sandbox';
    const r = await x.supabase.from('zatca_egs_units').insert({
      company_id:x.companyId,
      warehouse_id:data.warehouse_id || null,
      name,
      serial_number:serial,
      model:clean(data.model) || '1.0',
      solution_name:'AVERO OS',
      environment,
      invoice_type_code:zatcaInvoiceTypeCode(settings.data?.invoice_type || 'both'),
      registered_address:registeredAddress(settings.data || {}),
      business_category:clean(settings.data?.industry) || null,
      status:'draft'
    }).select().single();
    return r.error ? NextResponse.json({error:r.error.message},{status:400}) : NextResponse.json({record:r.data});
  }

  if(kind === 'generate_csr'){
    const id = clean(data.id);
    const [unitR, settingsR] = await Promise.all([
      x.supabase.from('zatca_egs_units').select('*').eq('id',id).eq('company_id',x.companyId).maybeSingle(),
      x.supabase.from('zatca_company_settings').select('*').eq('company_id',x.companyId).maybeSingle(),
    ]);
    if(unitR.error || settingsR.error) return NextResponse.json({error:(unitR.error || settingsR.error)?.message},{status:400});
    if(!unitR.data) return NextResponse.json({error:'EGS unit not found'},{status:404});
    const unit = unitR.data;
    const s = settingsR.data || {};
    if(!vatValid(s.vat_number)) return NextResponse.json({error:'Enter a valid Saudi VAT number before generating the CSR'},{status:400});
    if(!clean(s.legal_name) || !registeredAddress(s) || !clean(s.industry)) return NextResponse.json({error:'Legal name, registered address and industry are required before generating the CSR'},{status:400});
    if(s.environment === 'production'){
      return NextResponse.json({error:'Production key generation requires a non-exportable hardware/software security module. Use Simulation for AVERO testing until the production HSM/KMS key provider is connected.'},{status:409});
    }

    let branchName = clean(unit.name);
    if(unit.warehouse_id){
      const w = await x.supabase.from('inventory_warehouses').select('name').eq('id',unit.warehouse_id).eq('company_id',x.companyId).maybeSingle();
      if(w.data?.name) branchName = clean(w.data.name);
    }
    const commonName = clean(unit.common_name) || `AVERO-EGS-${unit.id}`;
    const generated = generateZatcaSoftwareCsr({
      commonName,
      branchName,
      legalName:clean(s.legal_name),
      vatNumber:digits(s.vat_number),
      serialNumber:unit.serial_number,
      model:unit.model || '1.0',
      invoiceType:s.invoice_type || 'both',
      registeredAddress:registeredAddress(s),
      businessCategory:clean(s.industry),
      environment:s.environment || 'simulation',
    });

    try {
      const secretId = await vaultUpsert(
        x.supabase,
        unit.private_key_vault_id,
        generated.privateKeyPem,
        `zatca-private-${x.companyId}-${unit.id}`,
        `AVERO ZATCA ${s.environment} private key for EGS ${unit.id}`
      );
      const u = await x.supabase.from('zatca_egs_units').update({
        environment:s.environment,
        key_provider:'vault_software',
        private_key_vault_id:secretId,
        csr_pem:generated.csrPem,
        public_key_pem:generated.publicKeyPem,
        common_name:commonName,
        registered_address:registeredAddress(s),
        business_category:clean(s.industry),
        invoice_type_code:generated.invoiceTypeCode,
        status:'csr_ready',
        csr_generated_at:new Date().toISOString(),
        last_error:null,
        updated_at:new Date().toISOString(),
      }).eq('id',unit.id).eq('company_id',x.companyId).select('id,status,csr_generated_at,common_name,invoice_type_code').single();
      if(u.error) return NextResponse.json({error:u.error.message},{status:400});
      return NextResponse.json({ok:true,record:u.data,template:generated.template,serial:generated.formattedSerial});
    } catch(error:any){
      return NextResponse.json({error:error?.message || 'Unable to store the ZATCA key securely'},{status:500});
    }
  }

  if(kind === 'request_compliance_csid'){
    const id = clean(data.id);
    const otp = digits(data.otp);
    if(!/^\d{6}$/.test(otp)) return NextResponse.json({error:'Enter the 6-digit OTP from FATOORA'},{status:400});
    const [unitR, settingsR] = await Promise.all([
      x.supabase.from('zatca_egs_units').select('*').eq('id',id).eq('company_id',x.companyId).maybeSingle(),
      x.supabase.from('zatca_company_settings').select('*').eq('company_id',x.companyId).maybeSingle(),
    ]);
    if(unitR.error || settingsR.error) return NextResponse.json({error:(unitR.error || settingsR.error)?.message},{status:400});
    if(!unitR.data) return NextResponse.json({error:'EGS unit not found'},{status:404});
    const unit = unitR.data;
    const s = settingsR.data || {};
    if(!unit.csr_pem) return NextResponse.json({error:'Generate the CSR for this EGS unit first'},{status:409});

    const endpoint = `${zatcaBaseUrl(s.environment || unit.environment)}/compliance`;
    let response:Response;
    try {
      response = await fetch(endpoint,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Accept':'application/json',
          'Accept-Version':'V2',
          'OTP':otp,
        },
        body:JSON.stringify({csr:pemBody(unit.csr_pem)}),
        cache:'no-store',
      });
    } catch(error:any){
      return NextResponse.json({error:`Unable to reach FATOORA: ${error?.message || 'network error'}`},{status:502});
    }
    const result:any = await parseResponse(response);
    if(!response.ok){
      const msg = clean(result?.message || result?.error || result?.dispositionMessage || result?.raw) || `FATOORA returned HTTP ${response.status}`;
      await x.supabase.from('zatca_egs_units').update({last_error:msg,updated_at:new Date().toISOString()}).eq('id',unit.id).eq('company_id',x.companyId);
      return NextResponse.json({error:msg,zatca_status:response.status,details:result},{status:response.status >= 500 ? 502 : 400});
    }

    const requestId = result.requestID ?? result.RequestID ?? result.requestId;
    const token = result.binarySecurityToken ?? result.BinarySecurityToken;
    const secret = result.secret ?? result.Secret;
    if(!requestId || !token || !secret) return NextResponse.json({error:'FATOORA returned an incomplete Compliance CSID response'},{status:502});

    try {
      const csidVaultId = await vaultUpsert(x.supabase,unit.compliance_csid_vault_id,String(token),`zatca-compliance-csid-${x.companyId}-${unit.id}`,`Compliance CSID for EGS ${unit.id}`);
      const secretVaultId = await vaultUpsert(x.supabase,unit.compliance_secret_vault_id,String(secret),`zatca-compliance-secret-${x.companyId}-${unit.id}`,`Compliance CSID secret for EGS ${unit.id}`);
      const issuedAt = new Date().toISOString();
      const u = await x.supabase.from('zatca_egs_units').update({
        certificate_request_id:String(requestId),
        compliance_request_id:String(requestId),
        compliance_csid_vault_id:csidVaultId,
        compliance_secret_vault_id:secretVaultId,
        status:'compliance_ready',
        compliance_issued_at:issuedAt,
        last_error:null,
        updated_at:issuedAt,
      }).eq('id',unit.id).eq('company_id',x.companyId).select('id,status,compliance_request_id,compliance_issued_at').single();
      await x.supabase.from('zatca_company_settings').update({onboarding_status:'compliance_pending',last_error:null,updated_at:issuedAt}).eq('company_id',x.companyId);
      if(u.error) return NextResponse.json({error:u.error.message},{status:400});
      return NextResponse.json({ok:true,record:u.data,disposition:result.dispositionMessage ?? result.DispositionMessage ?? 'ISSUED'});
    } catch(error:any){
      return NextResponse.json({error:error?.message || 'Unable to store Compliance CSID securely'},{status:500});
    }
  }

  if(kind === 'delete_egs'){
    const id = clean(data.id);
    const current = await x.supabase.from('zatca_egs_units').select('id,status').eq('id',id).eq('company_id',x.companyId).maybeSingle();
    if(!current.data) return NextResponse.json({error:'EGS unit not found'},{status:404});
    if(['compliance_ready','production_ready','active'].includes(current.data.status)) return NextResponse.json({error:'Onboarded EGS units must be revoked before removal'},{status:409});
    const r = await x.supabase.from('zatca_egs_units').delete().eq('id',id).eq('company_id',x.companyId);
    return r.error ? NextResponse.json({error:r.error.message},{status:400}) : NextResponse.json({ok:true});
  }

  return NextResponse.json({error:'Invalid action'},{status:400});
}
