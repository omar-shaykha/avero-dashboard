import { createAdminClient } from "@/lib/supabase/admin";

// Scheduled jobs bypass the signed-in user, so they must check the tenant's
// current subscription before generating or publishing content.
export async function hasFoxyEntitlement(companyId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("company_features")
    .select("enabled,expires_at,features(key)")
    .eq("company_id", companyId)
    .eq("enabled", true);
  if (error) throw error;

  const now = Date.now();
  const keys = new Set((data || [])
    .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
    .map((row) => {
      const feature = Array.isArray(row.features) ? row.features[0] : row.features;
      return feature?.key;
    }));
  return keys.has("app_intelligence") && keys.has("ai_marketing");
}
