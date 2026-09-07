import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin, type FeatureKey } from "@/lib/auth/authorization";

const agents = {
  sales: { feature: "ai_sales", manage: "sales.manage", key: "ai_sales" },
  marketing: { feature: "ai_marketing", manage: "marketing.manage", key: "ai_marketing" },
  hr: { feature: "ai_hr", manage: "hr.manage", key: "ai_hr" },
  support: { feature: "ai_support", manage: "support.manage", key: "ai_support" },
  inventory: { feature: "ai_inventory", manage: "inventory.manage", key: "ai_inventory" },
  "customer-care": { feature: "ai_customer_care", manage: "customer_care.manage", key: "ai_customer_care" },
  analytics: { feature: "ai_analytics", manage: "ai_analytics.manage", key: "ai_analytics" },
  warehouse: { feature: "ai_warehouse", manage: "warehouse.manage", key: "ai_warehouse" },
} as const satisfies Record<string, { feature: FeatureKey; manage: string; key: string }>;

type Agent = keyof typeof agents;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function GET(_request: Request, { params }: { params: Promise<{ agent: string }> }) {
  try {
    const { agent } = await params;
    if (!(agent in agents)) return Response.json({ error: "Unknown agent" }, { status: 404 });

    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const current = agents[agent as Agent];
    if (!(isKingAdmin(ctx) || canAccess(ctx, current.feature, current.manage))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const s = db();
    const { data, error } = await s
      .from("ai_agent_workers")
      .select("id,boss_agent_key,worker_key,worker_name,role_title,responsibility,instructions,make_scenario_id,make_module_label,status,sort_order,last_run_at")
      .eq("company_id", companyId)
      .eq("boss_agent_key", current.key)
      .order("sort_order", { ascending: true });

    if (error) return Response.json({ error: "Could not load agent workers" }, { status: 500 });
    return Response.json({ workers: data || [] });
  } catch (error) {
    console.error("Agent workers GET error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
