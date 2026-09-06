import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type FeatureKey =
  | "ai_sales"
  | "crm"
  | "analytics"
  | "ai_marketing"
  | "ai_hr"
  | "ai_support";

export interface AuthorizationContext {
  user: { id: string; email?: string };
  profile: {
    company_id: string | null;
    role: string | null;
    role_id: string | null;
  };
  permissions: string[];
  features: string[];
}

const LEGACY_PERMISSION_ALIASES: Record<string, string> = {
  view_crm: "crm.view",
  manage_crm: "crm.manage",
  view_analytics: "analytics.view",
  view_ai_sales: "sales.view",
  manage_ai_sales: "sales.manage",
  view_ai_marketing: "marketing.view",
  manage_ai_marketing: "marketing.manage",
  view_ai_hr: "hr.view",
  manage_ai_hr: "hr.manage",
  view_ai_support: "support.view",
  manage_ai_support: "support.manage",
};

function normalizePermissionKey(permissionKey: string) {
  return LEGACY_PERMISSION_ALIASES[permissionKey] || permissionKey;
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const supabase = getAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("company_id, role, role_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const permissions: string[] = [];
  if (profile?.role_id) {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("permissions(key)")
      .eq("role_id", profile.role_id);
    if (error) throw error;
    for (const row of data || []) {
      const permission = Array.isArray(row.permissions) ? row.permissions[0] : row.permissions;
      if (permission?.key) permissions.push(permission.key);
    }
  }

  const features: string[] = [];
  if (profile?.company_id) {
    const { data, error } = await supabase
      .from("company_features")
      .select("enabled, expires_at, features(key)")
      .eq("company_id", profile.company_id)
      .eq("enabled", true);
    if (error) throw error;
    const now = Date.now();
    for (const row of data || []) {
      const feature = Array.isArray(row.features) ? row.features[0] : row.features;
      if (feature?.key && (!row.expires_at || new Date(row.expires_at).getTime() > now)) {
        features.push(feature.key);
      }
    }
  }

  return {
    user: { id: user.id, email: user.email },
    profile: {
      company_id: profile?.company_id ?? null,
      role: profile?.role ?? null,
      role_id: profile?.role_id ?? null,
    },
    permissions,
    features,
  };
}

export function isSuperAdmin(context: AuthorizationContext | null) {
  return context?.profile.role === "super_admin";
}

export function hasPermission(context: AuthorizationContext | null, permissionKey: string) {
  const normalizedKey = normalizePermissionKey(permissionKey);
  return Boolean(isSuperAdmin(context) || context?.permissions.includes(normalizedKey));
}

export function hasFeature(context: AuthorizationContext | null, featureKey: FeatureKey) {
  return Boolean(isSuperAdmin(context) || context?.features.includes(featureKey));
}

export function canAccess(
  context: AuthorizationContext | null,
  featureKey: FeatureKey,
  permissionKey: string,
) {
  return Boolean(isSuperAdmin(context) || (
    hasFeature(context, featureKey) && hasPermission(context, permissionKey)
  ));
}
