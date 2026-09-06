import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, type FeatureKey } from "@/lib/auth/authorization";

const agents = {
  sales: { feature: "ai_sales", view: "sales.view", key: "ai_sales" },
  marketing: { feature: "ai_marketing", view: "marketing.view", key: "ai_marketing" },
  hr: { feature: "ai_hr", view: "hr.view", key: "ai_hr" },
  support: { feature: "ai_support", view: "support.view", key: "ai_support" },
  inventory: { feature: "ai_inventory", view: "inventory.view", key: "ai_inventory" },
  "customer-care": { feature: "ai_customer_care", view: "customer_care.view", key: "ai_customer_care" },
  analytics: { feature: "ai_analytics", view: "ai_analytics.view", key: "ai_analytics" },
  warehouse: { feature: "ai_warehouse", view: "warehouse.view", key: "ai_warehouse" },
} as const satisfies Record<string,{feature:FeatureKey;view:string;key:string}>;

type Agent = keyof typeof agents;
function db() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY; if (!url || !key) throw new Error("Missing Supabase configuration"); return createClient(url, key); }
export async function GET(_: Request, { params }: { params: Promise<{ agent: string }> }) {
  try { const { agent } = await params; if (!(agent in agents)) return Response.json({ error: "Unknown agent" }, { status: 404 }); const a = agents[agent as Agent]; const ctx = await getAuthorizationContext(); if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 }); if (!canAccess(ctx, a.feature, a.view)) return Response.json({ error: "Forbidden" }, { status: 403 }); const companyId = ctx.profile.company_id; if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 }); const { data, error } = await db().from("ai_agent_runs").select("id,agent_key,action,status,input,output,error_message,created_at,completed_at").eq("company_id", companyId).eq("agent_key", a.key).order("created_at", { ascending: false }).limit(12); if (error) return Response.json({ error: "Failed to load live runs" }, { status: 500 }); return Response.json({ agent: a.key, runs: data || [] }); } catch (error) { console.error("AI runs GET error:", error); return Response.json({ error: "Internal server error" }, { status: 500 }); }
}
