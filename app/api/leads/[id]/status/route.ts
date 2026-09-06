import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";

const VALID_STATUSES = ["new", "qualified", "quotation", "negotiation", "won", "lost"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await getAuthorizationContext();

    if (!access) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccess(access, "crm", "crm.manage")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = access.profile.company_id;
    if (!companyId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const status = typeof body.status === "string" ? body.status.toLowerCase() : "";

    if (!VALID_STATUSES.includes(status)) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);
    const { data, error } = await supabase
      .from("leads")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Lead status update error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json(data);
  } catch (error) {
    console.error("Lead status API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
