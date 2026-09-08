import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizationContext, hasPermission, isKingAdmin, isSuperAdmin, isTenantAdmin } from "@/lib/auth/authorization";

const ALLOWED_ROLES = new Set(["super_admin","admin","user"]);
const json=(body:unknown,status=200)=>Response.json(body,{status});
function db(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error("Missing Supabase configuration");return createClient(url,key,{auth:{persistSession:false}})}
function canViewSettings(a:any){return isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,"settings.view")}
function canManageSettings(a:any){return isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,"settings.manage")}
function canViewUsers(a:any){return isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,"users.view")}
function canCreateUsers(a:any){return isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,"users.manage")}
function canManageRoles(a:any){return isKingAdmin(a)||isSuperAdmin(a)||hasPermission(a,"users.roles.manage")}
function canManagePermissions(a:any){return isKingAdmin(a)||isSuperAdmin(a)||hasPermission(a,"users.permissions.manage")}
function clean(v:unknown,max=500){const s=String(v??"").trim();return s?s.slice(0,max):null}
function digits(v:unknown){return String(v??"").replace(/\D/g,"")}
async function rolePermissions(admin:SupabaseClient,roleId:string|null){if(!roleId)return new Set<string>();const {data,error}=await admin.from("role_permissions").select("permissions(key)").eq("role_id",roleId);if(error)throw error;const out=new Set<string>();for(const row of data||[]){const p=Array.isArray(row.permissions)?row.permissions[0]:row.permissions;if(p?.key)out.add(p.key)}return out}
async function effectivePermissions(admin:SupabaseClient,userId:string,roleId:string|null){const baseline=await rolePermissions(admin,roleId);const {data,error}=await admin.from("user_permission_overrides").select("allowed,permissions(key)").eq("user_id",userId);if(error)throw error;for(const row of data||[]){const p=Array.isArray(row.permissions)?row.permissions[0]:row.permissions;if(!p?.key)continue;if(row.allowed)baseline.add(p.key);else baseline.delete(p.key)}return [...baseline].sort()}
async function savePermissionSelection(admin:SupabaseClient,userId:string,roleId:string|null,selected:string[],grantedBy:string){const baseline=await rolePermissions(admin,roleId);const {data:valid,error:validError}=await admin.from("permissions").select("id,key");if(validError)throw validError;const byKey=new Map((valid||[]).map((p:any)=>[p.key,p.id]));const requested=new Set(selected.filter(k=>byKey.has(k)));await admin.from("user_permission_overrides").delete().eq("user_id",userId);const allKeys=new Set([...baseline,...requested]);const rows:any[]=[];for(const key of allKeys){const base=baseline.has(key),want=requested.has(key);if(base===want)continue;rows.push({user_id:userId,permission_id:byKey.get(key),allowed:want,granted_by:grantedBy,updated_at:new Date().toISOString()})}if(rows.length){const {error}=await admin.from("user_permission_overrides").insert(rows);if(error)throw error}}
async function findAuthUserByEmail(admin:SupabaseClient,email:string){const normalized=email.toLowerCase();for(let page=1;page<=10;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});if(error)throw error;const users=data?.users||[];const hit=users.find(u=>u.email?.toLowerCase()===normalized);if(hit)return hit;if(users.length<1000)return null}throw new Error("Auth user lookup exceeded safe pagination")}

export async function GET(){try{const access=await getAuthorizationContext();if(!access?.profile.company_id)return json({error:"Unauthorized"},401);if(!canViewSettings(access))return json({error:"Forbidden"},403);const admin=db(),companyId=access.profile.company_id;
 const [{data:company,error:companyError},{data:certificates,error:certError},{data:permissions,error:permError},{data:roles,error:roleError},{data:profiles,error:profilesError}]=await Promise.all([
  admin.from("companies").select("id,name,email,phone,industry,city,activity_key,activity_label,vat_number,commercial_registration_number,national_address,municipality_license_number,employee_count,unified_phone").eq("id",companyId).single(),
  admin.from("company_certificates").select("id,name,issuer,certificate_number,issued_at,expires_at,document_url,created_at").eq("company_id",companyId).order("created_at",{ascending:false}),
  admin.from("permissions").select("id,key,name,description").order("key"),
  admin.from("roles").select("id,key,name").in("key",["super_admin","admin","user"]).order("key"),
  canViewUsers(access)?admin.from("user_profiles").select("user_id,full_name,first_name,last_name,username,role,role_id,job_title,created_at").eq("company_id",companyId).neq("role","king_admin").order("created_at"):Promise.resolve({data:[],error:null} as any)
 ]);
 const err=companyError||certError||permError||roleError||profilesError;if(err){console.error("Company settings GET error",err);return json({error:"Failed to load company settings"},500)}
 const authMap=new Map<string,string>();if(canViewUsers(access)){const {data:authUsers,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;for(const u of authUsers?.users||[])if(u.email)authMap.set(u.id,u.email)}
 const users=[];for(const p of profiles||[])users.push({...p,email:authMap.get(p.user_id)||"",permissions:await effectivePermissions(admin,p.user_id,p.role_id)});
 return json({company,certificates:certificates||[],permissions:permissions||[],roles:roles||[],users,capabilities:{manage_company:canManageSettings(access),view_users:canViewUsers(access),create_users:canCreateUsers(access),manage_roles:canManageRoles(access),manage_permissions:canManagePermissions(access)},current_user_id:access.user.id});
 }catch(error){console.error("Company settings GET error",error);return json({error:"Internal server error"},500)}}

export async function PATCH(request:Request){try{const access=await getAuthorizationContext();if(!access?.profile.company_id)return json({error:"Unauthorized"},401);const admin=db(),companyId=access.profile.company_id;const body=await request.json();
 if(body.kind==="company"){
  if(!canManageSettings(access))return json({error:"Forbidden"},403);const vat=digits(body.data?.vat_number);if(vat&&!/^3\d{13}3$/.test(vat))return json({error:"Saudi VAT number must be 15 digits and start/end with 3"},400);const count=body.data?.employee_count===""||body.data?.employee_count==null?null:Number(body.data.employee_count);if(count!==null&&(!Number.isInteger(count)||count<0))return json({error:"Employee count must be a non-negative whole number"},400);
  const payload={name:clean(body.data?.name,160),email:clean(body.data?.email,320),phone:clean(body.data?.phone,50),unified_phone:clean(body.data?.unified_phone,50),industry:clean(body.data?.industry,160),city:clean(body.data?.city,120),vat_number:vat||null,commercial_registration_number:clean(body.data?.commercial_registration_number,80),national_address:clean(body.data?.national_address,500),municipality_license_number:clean(body.data?.municipality_license_number,100),employee_count:count};
  const {data,error}=await admin.from("companies").update(payload).eq("id",companyId).select("*").single();if(error)return json({error:"Could not save company information"},500);
  const {data:z}=await admin.from("zatca_company_settings").select("company_id").eq("company_id",companyId).maybeSingle();if(z){await admin.from("zatca_company_settings").update({vat_number:vat||null,legal_name:payload.name||null,city:payload.city||null,updated_at:new Date().toISOString()}).eq("company_id",companyId)}
  return json({company:data});
 }
 if(body.kind==="user_access"){
  const userId=String(body.data?.user_id||"");if(!userId)return json({error:"User is required"},400);if(userId===access.user.id)return json({error:"You cannot change your own role or permissions here"},409);const {data:target}=await admin.from("user_profiles").select("user_id,role,role_id").eq("user_id",userId).eq("company_id",companyId).maybeSingle();if(!target)return json({error:"User not found"},404);if(target.role==="super_admin"&&!isKingAdmin(access)&&!isSuperAdmin(access))return json({error:"Only Super Admin can manage another Super Admin"},403);
  const roleKey=String(body.data?.role||target.role);if(!ALLOWED_ROLES.has(roleKey))return json({error:"Invalid role"},400);if(roleKey==="super_admin"&&!isKingAdmin(access)&&!isSuperAdmin(access))return json({error:"Only Super Admin can grant Super Admin role"},403);
  let roleId=target.role_id;if(roleKey!==target.role){if(!canManageRoles(access))return json({error:"You cannot change user roles"},403);const {data:role}=await admin.from("roles").select("id").eq("key",roleKey).single();roleId=role.id;const {error}=await admin.from("user_profiles").update({role:roleKey,role_id:roleId,updated_at:new Date().toISOString()}).eq("user_id",userId).eq("company_id",companyId);if(error)return json({error:"Could not update role"},500)}
  if(Array.isArray(body.data?.permissions)){if(!canManagePermissions(access))return json({error:"You cannot manage permissions"},403);await savePermissionSelection(admin,userId,roleId,body.data.permissions.map(String),access.user.id)}
  return json({ok:true});
 }
 return json({error:"Unsupported update"},400);
 }catch(error){console.error("Company settings PATCH error",error);return json({error:"Internal server error"},500)}}

export async function POST(request:Request){let createdUserId:string|null=null;try{const access=await getAuthorizationContext();if(!access?.profile.company_id)return json({error:"Unauthorized"},401);const admin=db(),companyId=access.profile.company_id;const body=await request.json();
 if(body.kind==="create_user"){
  if(!canCreateUsers(access))return json({error:"Forbidden"},403);const email=String(body.data?.email||"").trim().toLowerCase(),password=String(body.data?.temporary_password||""),fullName=String(body.data?.full_name||"").trim(),roleKey=String(body.data?.role||"user");if(!/^\S+@\S+\.\S+$/.test(email))return json({error:"Valid email is required"},400);if(password.length<8||password.length>128)return json({error:"Temporary password must be 8-128 characters"},400);if(!ALLOWED_ROLES.has(roleKey))return json({error:"Invalid role"},400);if(roleKey==="super_admin"&&!isKingAdmin(access)&&!isSuperAdmin(access))return json({error:"Only Super Admin can create another Super Admin"},403);
  const existing=await findAuthUserByEmail(admin,email);let userId:string;if(existing){userId=existing.id;const {data:p}=await admin.from("user_profiles").select("company_id").eq("user_id",userId).maybeSingle();if(p?.company_id)return json({error:"This email already belongs to a company"},409)}else{const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)return json({error:error?.message||"Could not create account"},500);userId=data.user.id;createdUserId=userId}
  const {data:role}=await admin.from("roles").select("id").eq("key",roleKey).single();const names=fullName.split(/\s+/).filter(Boolean);const first=names[0]||null,last=names.length>1?names.slice(1).join(" "):null;const {error:profileError}=await admin.from("user_profiles").upsert({user_id:userId,company_id:companyId,role:roleKey,role_id:role.id,full_name:fullName||email,first_name:first,last_name:last,must_change_password:true,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(profileError){if(createdUserId)await admin.auth.admin.deleteUser(createdUserId);return json({error:"Could not assign user to company"},500)}
  if(Array.isArray(body.data?.permissions)&&canManagePermissions(access))await savePermissionSelection(admin,userId,role.id,body.data.permissions.map(String),access.user.id);
  return json({ok:true,user_id:userId},201);
 }
 if(body.kind==="add_certificate"){
  if(!canManageSettings(access))return json({error:"Forbidden"},403);const name=clean(body.data?.name,200);if(!name)return json({error:"Certificate name is required"},400);const payload={company_id:companyId,name,issuer:clean(body.data?.issuer,200),certificate_number:clean(body.data?.certificate_number,120),issued_at:clean(body.data?.issued_at,20),expires_at:clean(body.data?.expires_at,20)};const {data,error}=await admin.from("company_certificates").insert(payload).select("*").single();if(error)return json({error:"Could not add certificate"},500);return json({certificate:data},201);
 }
 if(body.kind==="remove_certificate"){
  if(!canManageSettings(access))return json({error:"Forbidden"},403);const id=String(body.data?.id||"");const {error}=await admin.from("company_certificates").delete().eq("id",id).eq("company_id",companyId);if(error)return json({error:"Could not remove certificate"},500);return json({ok:true});
 }
 return json({error:"Unsupported action"},400);
 }catch(error){console.error("Company settings POST error",error);if(createdUserId){try{await db().auth.admin.deleteUser(createdUserId)}catch{}}return json({error:"Internal server error"},500)}}
