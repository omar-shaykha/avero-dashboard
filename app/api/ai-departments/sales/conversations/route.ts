import { getAuthorizationContext, isKingAdmin, canAccess } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_sales", "sales.view"))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = ctx.profile.company_id;
    if (!companyId) {
      return Response.json({
        conversations: [],
        customers: [],
        runtime: [],
        stats: { inbound: 0, outbound: 0, leads: 0, qualified: 0 },
        history_scope: "all",
      });
    }

    const s = createAdminClient();
    const [
      conversationsResult,
      customersResult,
      leadsResult,
      qualifiedResult,
      inboundResult,
      outboundResult,
      runsResult,
      takeoverResult,
    ] = await Promise.all([
      s.from("conversations")
        .select("id,customer_id,direction,message,message_type,external_message_id,created_at,ai_generated")
        .eq("company_id", companyId)
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false })
        .limit(2000),
      s.from("customers")
        .select("id,name,phone,last_message_at,lead_status,interest_level")
        .eq("company_id", companyId)
        .eq("source", "whatsapp")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(500),
      s.from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("lead_source", "whatsapp"),
      s.from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("lead_source", "whatsapp")
        .in("status", ["qualified", "quotation", "negotiation", "won"]),
      s.from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("channel", "whatsapp")
        .eq("direction", "inbound"),
      s.from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("channel", "whatsapp")
        .eq("direction", "outbound"),
      s.from("ai_agent_runs")
        .select("id,action,status,input,output,created_at,completed_at")
        .eq("company_id", companyId)
        .eq("agent_key", "ai_sales")
        .order("created_at", { ascending: false })
        .limit(40),
      s.from("ai_agent_runs")
        .select("action")
        .eq("company_id", companyId)
        .eq("agent_key", "ai_sales")
        .eq("status", "running")
        .like("action", "leo_human_takeover:%")
        .limit(500),
    ]);

    const rows = conversationsResult.data || [];
    const takeover = new Set(
      (takeoverResult.data || [])
        .map((r: any) => String(r.action || "").split(":")[1])
        .filter(Boolean),
    );

    const customers = (customersResult.data || []).map((customer: any) => {
      const customerMessages = rows.filter((row: any) => row.customer_id === customer.id);
      const last = customerMessages[0];
      return {
        ...customer,
        last_message: last?.message || "",
        last_message_at: last?.created_at || customer.last_message_at,
        unread: customerMessages.filter((row: any) => row.direction === "inbound").length,
        ai_paused: takeover.has(customer.id),
      };
    }).sort((a: any, b: any) => String(b.last_message_at || "").localeCompare(String(a.last_message_at || "")));

    return Response.json({
      conversations: rows,
      customers,
      runtime: runsResult.data || [],
      stats: {
        inbound: inboundResult.count || 0,
        outbound: outboundResult.count || 0,
        leads: leadsResult.count || 0,
        qualified: qualifiedResult.count || 0,
      },
      history_scope: "all",
    });
  } catch (error) {
    console.error("Leo conversations error", error);
    return Response.json({ error: "Could not load Leo conversations" }, { status: 500 });
  }
}
