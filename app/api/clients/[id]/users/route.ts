import { NextResponse } from "next/server";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { ensureCompanyMembership } from "@/lib/auth/membership";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isKingAdmin(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: companyId } = await params;
  const { email: rawEmail } = await request.json().catch(() => ({}));
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  const db = createAdminClient();
  const [{ data: company, error: companyError }, { data: role, error: roleError }] = await Promise.all([
    db.from("companies").select("id").eq("id", companyId).maybeSingle(),
    db.from("roles").select("id").eq("key", "user").maybeSingle(),
  ]);
  if (companyError || roleError) return NextResponse.json({ error: "Could not validate user access" }, { status: 500 });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "User role is not configured" }, { status: 500 });

  // Look up an existing account before sending an invitation. Never attach a
  // user to a second company or alter an existing company's role.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Could not check the email" }, { status: 500 });
    const found = data.users.find(user => user.email?.toLowerCase() === email);
    if (found) return NextResponse.json({ error: "This email already has an account. Contact its owner before adding it." }, { status: 409 });
    if (data.users.length < 1000) break;
    if (page === 10) return NextResponse.json({ error: "Could not verify all existing users" }, { status: 503 });
  }

  // Supabase sends the user a one-time invitation. No password is displayed or
  // stored by King; membership and an empty permission set are provisioned now.
  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/change-password", request.url).toString(),
  });
  if (inviteError || !invited.user) return NextResponse.json({ error: inviteError?.message || "Could not send invitation" }, { status: 502 });
  const userId = invited.user.id;

  try {
    const { error: profileError } = await db.from("user_profiles").upsert({
      user_id: userId, company_id: companyId, role: "user", role_id: role.id,
      full_name: email, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (profileError) throw profileError;
    await ensureCompanyMembership(db, companyId, userId, role.id, access.user.id);

    const [{ data: rolePermissions, error: rolePermissionsError }, { data: permissions, error: permissionsError }] = await Promise.all([
      db.from("role_permissions").select("permission_id").eq("role_id", role.id),
      db.from("permissions").select("id"),
    ]);
    if (rolePermissionsError || permissionsError) throw rolePermissionsError || permissionsError;
    const baselineIds = new Set((rolePermissions || []).map(item => item.permission_id));
    // Deny the role's defaults until the customer's Super Admin grants them.
    const overrides = (permissions || []).filter(item => baselineIds.has(item.id)).map(item => ({
      user_id: userId, permission_id: item.id, allowed: false,
      granted_by: access.user.id, updated_at: new Date().toISOString(),
    }));
    if (overrides.length) {
      const { error } = await db.from("user_permission_overrides").upsert(overrides, { onConflict: "user_id,permission_id" });
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, user_id: userId, invited: true }, { status: 201 });
  } catch (error) {
    console.error("Client user invitation provisioning failed", error);
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Invitation sent but account setup failed; please retry" }, { status: 500 });
  }
}
