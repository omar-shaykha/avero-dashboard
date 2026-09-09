// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";

export const runtime = "nodejs";
const BUCKET="pos-product-images";
const MAX=5*1024*1024;
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const can=(a:any,p:string)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,p);
async function C(){const a=await getAuthorizationContext();return a?.profile?.company_id?{a,c:a.profile.company_id,s:db()}:null;}
const extFor=(type:string)=>type==="image/png"?"png":type==="image/webp"?"webp":"jpg";
const safePath=(companyId:string,path:any)=>typeof path==="string"&&path.startsWith(`${companyId}/`)?path:null;

async function uploadBytes(x:any,bytes:Uint8Array,type:string){
  const path=`${x.c}/${crypto.randomUUID()}.${extFor(type)}`;
  const up=await x.s.storage.from(BUCKET).upload(path,bytes,{contentType:type,cacheControl:"31536000",upsert:false});
  if(up.error)throw new Error(up.error.message);
  const pub=x.s.storage.from(BUCKET).getPublicUrl(path);
  return {path,url:pub.data.publicUrl};
}

export async function POST(req:Request){
  const x=await C();if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.manage"))return NextResponse.json({error:"Forbidden"},{status:403});
  const ct=req.headers.get("content-type")||"";

  if(ct.includes("multipart/form-data")){
    const fd=await req.formData();
    const file=fd.get("file");
    if(!(file instanceof File))return NextResponse.json({error:"Image file is required"},{status:400});
    if(!["image/jpeg","image/png","image/webp"].includes(file.type))return NextResponse.json({error:"Use JPG, PNG or WEBP"},{status:400});
    if(file.size<=0||file.size>MAX)return NextResponse.json({error:"Image must be 5 MB or less"},{status:400});
    try{
      const out=await uploadBytes(x,new Uint8Array(await file.arrayBuffer()),file.type);
      return NextResponse.json(out);
    }catch(e:any){return NextResponse.json({error:e.message||"Image upload failed"},{status:400});}
  }

  const b=await req.json().catch(()=>({}));
  if(b.kind==="bind"){
    const p=await x.s.from("sales_products").select("id,image_path").eq("id",b.product_id).eq("company_id",x.c).maybeSingle();
    if(!p.data)return NextResponse.json({error:"Invalid product"},{status:404});
    const path=safePath(x.c,b.path);if(!path)return NextResponse.json({error:"Invalid image path"},{status:400});
    const url=String(b.url||"").trim();if(!url)return NextResponse.json({error:"Image URL is required"},{status:400});
    const r=await x.s.from("sales_products").update({image_url:url,image_path:path,updated_at:new Date().toISOString()}).eq("id",p.data.id).eq("company_id",x.c).select("id,image_url,image_path").single();
    if(r.error)return NextResponse.json({error:r.error.message},{status:400});
    const old=safePath(x.c,p.data.image_path);if(old&&old!==path)await x.s.storage.from(BUCKET).remove([old]);
    return NextResponse.json({record:r.data});
  }

  if(b.kind==="remove"){
    const path=safePath(x.c,b.path);if(!path)return NextResponse.json({error:"Invalid image path"},{status:400});
    const r=await x.s.storage.from(BUCKET).remove([path]);
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({ok:true});
  }

  if(b.kind==="migrate_legacy"){
    const q=await x.s.from("sales_products").select("id,image_url,image_path").eq("company_id",x.c).eq("active",true).like("image_url","data:image/%").limit(50);
    if(q.error)return NextResponse.json({error:q.error.message},{status:400});
    let migrated=0,failed=0;
    for(const p of q.data||[]){
      try{
        const m=String(p.image_url||"").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
        if(!m){failed++;continue;}
        const bytes=Buffer.from(m[2],"base64");if(!bytes.length||bytes.length>MAX){failed++;continue;}
        const out=await uploadBytes(x,new Uint8Array(bytes),m[1]);
        const u=await x.s.from("sales_products").update({image_url:out.url,image_path:out.path,updated_at:new Date().toISOString()}).eq("id",p.id).eq("company_id",x.c);
        if(u.error){await x.s.storage.from(BUCKET).remove([out.path]);failed++;continue;}
        migrated++;
      }catch{failed++;}
    }
    return NextResponse.json({migrated,failed});
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}
