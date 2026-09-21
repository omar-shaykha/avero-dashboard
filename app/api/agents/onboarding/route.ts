import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

const SPECS:Record<string,{name:string;required:string[]}> = {
  ai_hr:{name:"Aero",required:["department_scope","work_schedule","attendance_method","hiring_focus"]},
  ai_support:{name:"Gor",required:["support_channels","service_hours","sla_target","escalation_contact"]},
  ai_inventory:{name:"Vexa",required:["inventory_scope","low_stock_rule","reorder_approval","count_frequency"]},
  ai_warehouse:{name:"Bruno",required:["warehouse_scope","receiving_method","count_frequency","transfer_approval"]},
  ai_customer_care:{name:"Rex",required:["customer_channels","working_hours","response_target","escalation_rule"]},
  ai_analytics:{name:"Nova",required:["report_frequency","kpis","report_recipients","alert_rules"]},
};

const METHODS=new Set(["mada","visa","apple_pay","paypal"]);

export async function POST(req:Request){
  const access=await getAuthorizationContext();
  if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!(isKingAdmin(access)||isTenantAdmin(access)))return NextResponse.json({error:"Admin access required"},{status:403});
  const companyId=access.profile.company_id;
  if(!companyId)return NextResponse.json({error:"Company not configured"},{status:409});

  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");
  const agentKey=String(body.agent_key||"");
  const spec=SPECS[agentKey];
  if(!spec)return NextResponse.json({error:"Invalid AI employee"},{status:400});
  const s=createAdminClient();

  if(action==="save_configuration"){
    const settings=body.settings && typeof body.settings==="object" ? body.settings : {};
    const missing=spec.required.filter((key)=>!String(settings[key]??"").trim());
    if(missing.length)return NextResponse.json({error:"Missing required employee setup",missing},{status:400});
    const {error}=await s.from("company_ai_agent_settings").upsert({
      company_id:companyId,
      agent_key:agentKey,
      settings,
      onboarding_status:"configured",
      updated_at:new Date().toISOString(),
    },{onConflict:"company_id,agent_key"});
    if(error)return NextResponse.json({error:error.message},{status:400});
    return NextResponse.json({ok:true,status:"configured"});
  }

  if(action==="prepare_payment"){
    const billingCycle=String(body.billing_cycle||"");
    const paymentMethod=String(body.payment_method||"");
    if(!["monthly","yearly"].includes(billingCycle))return NextResponse.json({error:"Choose monthly or yearly billing"},{status:400});
    if(!METHODS.has(paymentMethod))return NextResponse.json({error:"Choose a payment method"},{status:400});

    const {data:setup}=await s.from("company_ai_agent_settings")
      .select("id,onboarding_status,settings")
      .eq("company_id",companyId).eq("agent_key",agentKey).maybeSingle();
    if(!setup||setup.onboarding_status==="draft")return NextResponse.json({error:"Complete employee setup first"},{status:409});

    const {data:request,error}=await s.from("subscription_checkout_requests").insert({
      company_id:companyId,
      user_id:access.user.id,
      plan_key:agentKey,
      plan_name:spec.name+" AI Employee",
      setup_fee:0,
      monthly_fee:0,
      currency:"SAR",
      billing_cycle:billingCycle,
      payment_method:paymentMethod,
      status:"pending_gateway_setup",
      metadata:{
        source:"ai_employee_hiring",
        agent_key:agentKey,
        employee_name:spec.name,
        billing_cycle:billingCycle,
        employee_settings:setup.settings,
        activation_rule:"Activate only after verified paid entitlement is active",
        pricing_required:true,
        gateway_required:true
      }
    }).select("id,status,billing_cycle,payment_method,created_at").single();
    if(error)return NextResponse.json({error:error.message},{status:400});

    await s.from("company_ai_agent_settings").update({
      onboarding_status:"payment_pending",
      billing_cycle:billingCycle,
      checkout_request_id:request.id,
      updated_at:new Date().toISOString(),
    }).eq("company_id",companyId).eq("agent_key",agentKey);

    return NextResponse.json({
      ok:true,
      checkout_request:request,
      checkout_url:null,
      code:"PAYMENT_GATEWAY_REQUIRED",
      message:"Employee setup is ready. Connect/configure the payment gateway and agent price to collect payment. Activation remains locked until payment is verified."
    });
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}
