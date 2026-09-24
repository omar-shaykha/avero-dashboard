import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasActiveCompanyMembership(db: SupabaseClient, companyId: string, userId: string, role?: string | null) {
  if (role === "king_admin") return true;
  const { data, error } = await db.from("company_memberships")
    .select("status").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.status === "active";
}

/** Bridge new V2 membership records to the existing one-company profile model. */
export async function ensureCompanyMembership(
  db: SupabaseClient,
  companyId: string,
  userId: string,
  roleId: string | null,
  createdBy?: string,
) {
  const { error: insertError } = await db.from("company_memberships")
    .upsert({ company_id: companyId, user_id: userId, status: "active", membership_scope: "company", created_by: createdBy || null }, {
      onConflict: "company_id,user_id", ignoreDuplicates: true,
    });
  if (insertError) throw insertError;

  const { data: membership, error: lookupError } = await db.from("company_memberships")
    .select("id,status").eq("company_id", companyId).eq("user_id", userId).single();
  if (lookupError || !membership) throw lookupError || new Error("Company membership was not created");
  // An existing suspended membership must never be reactivated by provisioning.
  if (membership.status !== "active") throw new Error("Existing company membership is not active");

  if (roleId) {
    const { data: assigned, error: roleLookupError } = await db.from("membership_roles")
      .select("id").eq("membership_id", membership.id).eq("role_id", roleId).is("branch_id", null).maybeSingle();
    if (roleLookupError) throw roleLookupError;
    if (!assigned) {
      const { error: roleError } = await db.from("membership_roles")
        .insert({ membership_id: membership.id, company_id: companyId, role_id: roleId, assigned_by: createdBy || null });
      if (roleError && roleError.code !== "23505") throw roleError;
    }
  }
}
