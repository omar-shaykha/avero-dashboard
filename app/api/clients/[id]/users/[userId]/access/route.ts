import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const ALLOWED_ROLES = new Set(["super_admin", "admin", "user"]);
const SINGLE_PERMISSION_MODES = new Set(["allow", "deny", "reset"]);

type PermissionUpdate = { permission_id?: string; allowed?: boolean };

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

async function updateRole(db: ReturnType<typeof admin>, companyId: string, userId: string, roleKey: string) {
  if (!ALLOWED_ROLES.has(roleKey)) return { error: json({ error: "Invalid role" }, 400) };
  const { data: role } = await db.from("roles").select("id").eq("key", roleKey).maybeSingle();
  if (!role) return { error: json({ error: "Role not configured" }, 400) };
  const { error } = await db.from("user_profiles").update({ role: roleKey, role_id: role.id }).eq("user_id", userId).eq("company_id", companyId);
  if (error) return { error: json({ error: "Could not update role" }, 500) };
  return { ok: true };
}

async function upsertPermissionOverrides(db: ReturnType<typeof admin>, userId: string, grantedBy: string, permissions: PermissionUpdate[]) {
  const clean = permissions
    .filter((item): item is { permission_id: string; allowed: boolean } => typeof item.permission_id === "string" && typeof item.allowed === "boolean")
    .map((item) => ({ permission_id: item.permission_id, allowed: item.allowed }));

  if (!clean.length) return { ok: true };

  const ids = [...new Set(clean.map((item) => item.permission_id))];
  const { data: valid, error: validError } = await db.from("permissions").select("id").in("id", ids);
  if (validError) return { error: json({ error: "Could not validate permissions" }, 500) };
  if ((valid || []).length !== ids.length) return { error: json({ error: "One or more permissions were not found" }, 400) };

  const now = new Date().toISOString();
  const rows = clean.map((item) => ({
    user_id: userId,
    permission_id: item.permission_id,
    allowed: item.allowed,
    granted_by: grantedBy,
    updated_at: now,
  }));

  const { error } = await db.from("user_permission_overrides").upsert(rows, { onConflict: "user_id,permission_id" });
  if (error) return { error: json({ error: "Could not update permissions" }, 500) };
  return { ok: true };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) return json({ error: "Unauthorized" }, 401);
  if (!isKingAdmin(access)) return json({ error: "Forbidden" }, 403);

  const { id, userId } = await params;
  const body = await req.json();
  const db = admin();

  const { data: target } = await db.from("user_profiles").select("user_id,company_id,role").eq("user_id", userId).eq("company_id", id).maybeSingle();
  if (!target) return json({ error: "User not found" }, 404);
  if (target.role === "king_admin") return json({ error: "King Admin cannot be modified here" }, 403);

  if (body.type === "bulk") {
    if (body.role && body.role !== target.role) {
      const roleResult = await updateRole(db, id, userId, String(body.role));
      if (roleResult.error) return roleResult.error;
    }

    const permissionsResult = await upsertPermissionOverrides(db, userId, access.user.id, Array.isArray(body.permissions) ? body.permissions : []);
    if (permissionsResult.error) return permissionsResult.error;

    return json({ ok: true });
  }

  if (body.type === "role") {
    const roleResult = await updateRole(db, id, userId, String(body.role || ""));
    if (roleResult.error) return roleResult.error;
    return json({ ok: true });
  }

  if (body.type === "permission") {
    if (typeof body.permission_id !== "string" || !SINGLE_PERMISSION_MODES.has(body.mode)) return json({ error: "Invalid permission update" }, 400);

    const { data: permission } = await db.from("permissions").select("id").eq("id", body.permission_id).maybeSingle();
    if (!permission) return json({ error: "Permission not found" }, 404);

    if (body.mode === "reset") {
      const { error } = await db.from("user_permission_overrides").delete().eq("user_id", userId).eq("permission_id", body.permission_id);
      if (error) return json({ error: "Could not reset permission" }, 500);
    } else {
      const permissionsResult = await upsertPermissionOverrides(db, userId, access.user.id, [{ permission_id: body.permission_id, allowed: body.mode === "allow" }]);
      if (permissionsResult.error) return permissionsResult.error;
    }

    return json({ ok: true });
  }

  return json({ error: "Unsupported update" }, 400);
}
