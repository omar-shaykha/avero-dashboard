import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function displayName(profile: { full_name?: string | null; first_name?: string | null; last_name?: string | null; username?: string | null; nickname?: string | null } | null | undefined, email?: string) {
  return profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.nickname || profile?.username || email?.split("@")[0] || "Employee";
}

export async function GET() {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });
    const s = admin();
    const [{ data: profile }, { data: biometric }, { data: logs }] = await Promise.all([
      s.from("user_profiles").select("first_name,last_name,full_name,username,nickname").eq("user_id", ctx.user.id).maybeSingle(),
      s.from("employee_biometrics").select("id,biometric_type,device_user_id,biometric_status,enrolled_at,last_verified_at,metadata,created_at,updated_at").eq("company_id", companyId).eq("user_id", ctx.user.id).eq("biometric_type", "fingerprint").maybeSingle(),
      s.from("attendance_logs").select("id,log_type,source,verified_by,log_time,note,created_at").eq("company_id", companyId).eq("user_id", ctx.user.id).order("log_time", { ascending: false }).limit(10),
    ]);
    return Response.json({ employee_name: displayName(profile, ctx.user.email), biometric, logs: logs || [] });
  } catch (error) {
    console.error("Biometrics GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const s = admin();
    const { data: profile } = await s.from("user_profiles").select("first_name,last_name,full_name,username,nickname").eq("user_id", ctx.user.id).maybeSingle();
    const employeeName = displayName(profile, ctx.user.email);
    if (action === "request_enrollment" || action === "mark_enrolled") {
      const status = action === "mark_enrolled" ? "enrolled" : "pending_enrollment";
      const payload = {
        company_id: companyId,
        user_id: ctx.user.id,
        employee_name: employeeName,
        biometric_type: "fingerprint",
        device_user_id: typeof body.device_user_id === "string" ? body.device_user_id.slice(0, 120) : null,
        biometric_status: status,
        enrolled_at: status === "enrolled" ? new Date().toISOString() : null,
        metadata: { note: body.note || null, source: "profile" },
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await s.from("employee_biometrics").upsert(payload, { onConflict: "company_id,user_id,biometric_type" }).select("*").single();
      if (error) return Response.json({ error: "Failed to save biometric profile" }, { status: 500 });
      return Response.json({ ok: true, biometric: data });
    }
    if (["check_in", "check_out", "break_start", "break_end"].includes(action)) {
      const { data: biometric } = await s.from("employee_biometrics").select("id,biometric_status").eq("company_id", companyId).eq("user_id", ctx.user.id).eq("biometric_type", "fingerprint").maybeSingle();
      const verifiedBy = biometric?.biometric_status === "enrolled" ? "fingerprint_profile" : "manual_profile";
      const { data, error } = await s.from("attendance_logs").insert({ company_id: companyId, user_id: ctx.user.id, biometric_id: biometric?.id || null, employee_name: employeeName, log_type: action, source: "profile", verified_by: verifiedBy, note: typeof body.note === "string" ? body.note.slice(0, 300) : null, metadata: { biometric_status: biometric?.biometric_status || "not_enrolled" } }).select("*").single();
      if (error) return Response.json({ error: "Failed to save attendance log" }, { status: 500 });
      if (biometric?.id) await s.from("employee_biometrics").update({ last_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", biometric.id);
      return Response.json({ ok: true, log: data });
    }
    return Response.json({ error: "Unsupported biometric action" }, { status: 400 });
  } catch (error) {
    console.error("Biometrics POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
