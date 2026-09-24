import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_ORDER = ["monitoring","pos","cashier","add_items","purchasing","agents","crm","clients","apps","settings","go","subscriptions"] as const;
const allowed = new Set<string>(DEFAULT_ORDER);

function normalize(value: unknown) {
  const input = Array.isArray(value) ? value.map(String) : [];
  const unique = input.filter((key, index) => allowed.has(key) && input.indexOf(key) === index);
  if (unique.includes("pos")) {
    let afterPos = unique.indexOf("pos") + 1;
    for (const key of ["cashier", "add_items", "purchasing"]) {
      if (!unique.includes(key)) unique.splice(afterPos++, 0, key);
    }
  }
  return [...unique, ...DEFAULT_ORDER.filter((key) => !unique.includes(key))];
}

export async function GET() {
  const access = await getAuthorizationContext();
  if (!access) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isKingAdmin(access)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!access.profile.company_id) return Response.json({ order: [...DEFAULT_ORDER] });

  const s = createAdminClient();
  const { data, error } = await s.from("user_preferences")
    .select("sidebar_order")
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (error) return Response.json({ error: "Could not load sidebar order" }, { status: 500 });
  return Response.json({ order: normalize(data?.sidebar_order) });
}

export async function PATCH(request: Request) {
  const access = await getAuthorizationContext();
  if (!access) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isKingAdmin(access)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!access.profile.company_id) return Response.json({ error: "Company required" }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const order = normalize(body.order);
  const s = createAdminClient();
  const row = {
    user_id: access.user.id,
    company_id: access.profile.company_id,
    sidebar_order: order,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await s.from("user_preferences")
    .select("user_id")
    .eq("user_id", access.user.id)
    .maybeSingle();

  const result = existing
    ? await s.from("user_preferences").update(row).eq("user_id", access.user.id)
    : await s.from("user_preferences").insert({
        ...row,
        language: "en",
        theme: "system",
        notifications_enabled: true,
        notification_sound: true,
      });

  if (result.error) return Response.json({ error: "Could not save sidebar order" }, { status: 500 });
  return Response.json({ ok: true, order });
}
