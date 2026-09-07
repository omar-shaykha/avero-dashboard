import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin, canAccess } from "@/lib/auth/authorization";

const GRAPH_VERSION=process.env.META_GRAPH_VERSION||"v23.0";
function db(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;if(!u||!k)throw new Error("Missing Supabase configuration");return createClient(u,k)}
async function secret(s:ReturnType<typeof db>,name:string){const{data,error}=await s.rpc("get_avero_secret",{secret_name:name});if(error)throw error;return typeof data==="string"?data:null}

export async function POST(request:Request){try{
 const ctx=await getAuthorizationContext();if(!ctx)return Response.json({error:"Unauthorized"},{status:401});if(!(isKingAdmin(ctx)||canAccess(ctx,"ai_sales","sales.manage")))return Response.json({error:"Forbidden"},{status:403});
 const companyId=ctx.profile.company_id;if(!companyId)return Response.json({error:"Company required"},{status:400});const s=db();
 const form=await request.formData();const customerId=String(form.get("customer_id")||"");const text=String(form.get("message")||"").trim().slice(0,4000);const file=form.get("file");
 const [{data:customer},{data:company},token]=await Promise.all([s.from("customers").select("id,phone,name").eq("id",customerId).eq("company_id",companyId).maybeSingle(),s.from("companies").select("whatsapp_phone_number_id").eq("id",companyId).maybeSingle(),secret(s,"meta_whatsapp_access_token")]);
 if(!customer?.phone||!company?.whatsapp_phone_number_id||!token)return Response.json({error:"WhatsApp connection or customer is missing"},{status:400});
 const phoneId=String(company.whatsapp_phone_number_id);let body:any;let stored=text;let messageType="text";
 if(file instanceof File&&file.size>0){if(file.size>16*1024*1024)return Response.json({error:"Attachment is too large (16 MB max)"},{status:400});const upload=new FormData();upload.set("messaging_product","whatsapp");upload.set("file",file,file.name);const ur=await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneId)}/media`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body:upload});const uj=await ur.json().catch(()=>({}));if(!ur.ok)throw new Error(`Meta media upload failed ${ur.status} ${JSON.stringify(uj).slice(0,250)}`);const mime=file.type||"application/octet-stream";messageType=mime.startsWith("image/")?"image":mime.startsWith("video/")?"video":mime.startsWith("audio/")?"audio":"document";const media:any={id:uj.id};if(text&&messageType!=="audio")media.caption=text;if(messageType==="document")media.filename=file.name;body={messaging_product:"whatsapp",to:String(customer.phone).replace(/\D/g,""),type:messageType,[messageType]:media};stored=text||`Attachment: ${file.name}`;
 }else{if(!text)return Response.json({error:"Write a message or attach a file"},{status:400});body={messaging_product:"whatsapp",to:String(customer.phone).replace(/\D/g,""),type:"text",text:{preview_url:false,body:text}}}
 const send=await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneId)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});const out=await send.json().catch(()=>({}));if(!send.ok)throw new Error(`WhatsApp send failed ${send.status} ${JSON.stringify(out).slice(0,300)}`);const sentId=String(out?.messages?.[0]?.id||"")||null;
 await s.from("conversations").insert({company_id:companyId,customer_id:customer.id,channel:"whatsapp",direction:"outbound",message:stored,message_type:messageType,external_message_id:sentId,ai_generated:false});
 await s.from("ai_agent_runs").insert({company_id:companyId,agent_key:"ai_sales",action:"human_whatsapp_reply",status:"completed",input:{customer_id:customer.id},output:{sent_message_id:sentId,message_type:messageType,source:"avero_human"},completed_at:new Date().toISOString()});
 return Response.json({ok:true,sent_message_id:sentId,message_type:messageType});
}catch(e){console.error("Human WhatsApp send error",e);return Response.json({error:"Could not send WhatsApp message"},{status:500})}}
