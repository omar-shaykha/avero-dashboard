import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type FeatureKey = "ai_sales" | "crm" | "analytics" | "ai_marketing" | "ai_hr" | "ai_support";
export interface AuthorizationContext { user:{id:string;email?:string}; profile:{company_id:string|null;role:string|null;role_id:string|null}; permissions:string[]; features:string[]; }
const LEGACY_PERMISSION_ALIASES:Record<string,string>={view_crm:"crm.view",manage_crm:"crm.manage",view_analytics:"analytics.view",view_ai_sales:"sales.view",manage_ai_sales:"sales.manage",view_ai_marketing:"marketing.view",manage_ai_marketing:"marketing.manage",view_ai_hr:"hr.view",manage_ai_hr:"hr.manage",view_ai_support:"support.view",manage_ai_support:"support.manage"};
function normalizePermissionKey(key:string){return LEGACY_PERMISSION_ALIASES[key]||key}
function getAdminClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error("Missing Supabase configuration");return createClient(url,key)}
export async function getAuthorizationContext():Promise<AuthorizationContext|null>{
 const authClient=await createServerClient();const{data:{user}}=await authClient.auth.getUser();if(!user)return null;
 const supabase=getAdminClient();
 const{data:profile,error:profileError}=await supabase.from("user_profiles").select("company_id,role,role_id").eq("user_id",user.id).maybeSingle();if(profileError)throw profileError;
 // Tenant roles are hierarchy labels only. Runtime permissions come only from explicit per-user overrides.
 // King Admin bypasses permission/feature checks through isKingAdmin/hasPermission/hasFeature below.
 const effective=new Map<string,boolean>();
 const{data:overrides,error:overridesError}=await supabase.from("user_permission_overrides").select("allowed,permissions(key)").eq("user_id",user.id);if(overridesError)throw overridesError;
 for(const row of overrides||[]){const permission=Array.isArray(row.permissions)?row.permissions[0]:row.permissions;if(permission?.key)effective.set(permission.key,Boolean(row.allowed))}
 const permissions=[...effective.entries()].filter(([,allowed])=>allowed).map(([key])=>key);
 const features:string[]=[];
 if(profile?.company_id){const{data,error}=await supabase.from("company_features").select("enabled,expires_at,features(key)").eq("company_id",profile.company_id).eq("enabled",true);if(error)throw error;const now=Date.now();for(const row of data||[]){const feature=Array.isArray(row.features)?row.features[0]:row.features;if(feature?.key&&(!row.expires_at||new Date(row.expires_at).getTime()>now))features.push(feature.key)}}
 return{user:{id:user.id,email:user.email},profile:{company_id:profile?.company_id??null,role:profile?.role??null,role_id:profile?.role_id??null},permissions,features}
}
export function isKingAdmin(context:AuthorizationContext|null){return context?.profile.role==="king_admin"}
export function isSuperAdmin(context:AuthorizationContext|null){return context?.profile.role==="super_admin"}
export function isTenantAdmin(context:AuthorizationContext|null){return context?.profile.role==="super_admin"||context?.profile.role==="admin"}
export function hasPermission(context:AuthorizationContext|null,permissionKey:string){return Boolean(isKingAdmin(context)||context?.permissions.includes(normalizePermissionKey(permissionKey)))}
export function hasFeature(context:AuthorizationContext|null,featureKey:FeatureKey){return Boolean(isKingAdmin(context)||context?.features.includes(featureKey))}
export function canAccess(context:AuthorizationContext|null,featureKey:FeatureKey,permissionKey:string){return Boolean(isKingAdmin(context)||(hasFeature(context,featureKey)&&hasPermission(context,permissionKey)))}
export function canManageCompanyUsers(context:AuthorizationContext|null){return Boolean(isKingAdmin(context)||hasPermission(context,"users.permissions.manage"))}
