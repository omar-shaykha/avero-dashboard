import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isSuperAdmin } from "@/lib/auth/authorization";

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function rollbackCreatedUser(supabase: SupabaseClient, userId: string | null) {
  if (!userId) return;
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) console.error("Client provisioning rollback failed:", error);
}

async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  const normalized = email.toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < perPage) return null;
  }

  throw new Error("Auth user lookup exceeded safe pagination limit");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const context = await getAuthorizationContext();
    if (!context) return json({ error: "Unauthorized" }, 401);
    if (!isSuperAdmin(context)) return json({ error: "Forbidden" }, 403);

    const supabase = getAdminClient();
    if (!supabase) return json({ error: "Missing Supabase configuration" }, 500);

    const { data: companies, error } = await supabase
      .from("companies")
      .select("id,name,whatsapp_phone_number_id,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Clients list error:", error);
      return json({ error: "Failed to fetch companies" }, 500);
    }

    return json(companies || []);
  } catch (error) {
    console.error("Clients GET error:", error);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function POST(request: Request) {
  let createdUserId: string | null = null;
  let supabase: SupabaseClient | null = null;
  let provisioningCompleted = false;

  try {
    const context = await getAuthorizationContext();
    if (!context) return json({ error: "Unauthorized" }, 401);
    if (!isSuperAdmin(context)) return json({ error: "Forbidden" }, 403);

    supabase = getAdminClient();
    if (!supabase) return json({ error: "Missing Supabase configuration" }, 500);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }

    const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
    const adminEmail = typeof body.admin_email === "string" ? body.admin_email.trim().toLowerCase() : "";
    const temporaryPassword = typeof body.temporary_password === "string" ? body.temporary_password : "";
    const whatsappPhoneNumberId = body.whatsapp_phone_number_id == null || body.whatsapp_phone_number_id === ""
      ? null
      : typeof body.whatsapp_phone_number_id === "string"
        ? body.whatsapp_phone_number_id.trim()
        : "__invalid__";

    if (!companyName) return json({ error: "Company name is required" }, 400);
    if (companyName.length > 160) return json({ error: "Company name is too long" }, 400);

    if (!adminEmail) return json({ error: "Admin email is required" }, 400);
    if (adminEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return json({ error: "Invalid email format" }, 400);
    }

    if (!temporaryPassword) return json({ error: "Temporary password is required" }, 400);
    if (temporaryPassword.length < 8 || temporaryPassword.length > 128) {
      return json({ error: "Password must be between 8 and 128 characters" }, 400);
    }

    if (whatsappPhoneNumberId === "__invalid__" || (whatsappPhoneNumberId && !/^\d{6,32}$/.test(whatsappPhoneNumberId))) {
      return json({ error: "Invalid WhatsApp phone number ID" }, 400);
    }

    let existingAuthUser;
    try {
      existingAuthUser = await findAuthUserByEmail(supabase, adminEmail);
    } catch (error) {
      console.error("Auth user lookup error:", error);
      return json({ error: "Could not verify admin account" }, 500);
    }

    let authUserCreated = false;

    if (!existingAuthUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: temporaryPassword,
        email_confirm: true,
      });

      if (error || !data?.user?.id) {
        console.error("Auth user creation error:", error);
        return json({ error: "Failed to create admin account" }, 500);
      }

      createdUserId = data.user.id;
      authUserCreated = true;
    } else {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("user_id", existingAuthUser.id)
        .maybeSingle();

      if (error) {
        console.error("Existing admin profile lookup error:", error);
        return json({ error: "Failed to verify existing admin account" }, 500);
      }

      if (profile?.company_id) {
        return json({ error: "Admin account already belongs to a company" }, 409);
      }
    }

    const { data: companyId, error: rpcError } = await supabase.rpc("create_client_company", {
      p_company_name: companyName,
      p_whatsapp_phone_number_id: whatsappPhoneNumberId,
      p_user_email: adminEmail,
    });

    if (rpcError || !companyId) {
      console.error("Client provisioning RPC error:", rpcError);
      await rollbackCreatedUser(supabase, createdUserId);
      createdUserId = null;

      const message = rpcError?.message || "";
      if (message.includes("already belongs to company")) {
        return json({ error: "Admin account already belongs to a company" }, 409);
      }
      if (message.includes("already assigned")) {
        return json({ error: "WhatsApp phone number is already assigned to another company" }, 409);
      }
      return json({ error: "Failed to create client company" }, 500);
    }

    provisioningCompleted = true;
    return json({
      success: true,
      company_id: companyId,
      company_name: companyName,
      admin_email: adminEmail,
      auth_user_created: authUserCreated,
    }, 201);
  } catch (error) {
    console.error("Clients POST error:", error);
    if (!provisioningCompleted && supabase && createdUserId) {
      await rollbackCreatedUser(supabase, createdUserId);
    }
    return json({ error: "Internal server error" }, 500);
  }
}
