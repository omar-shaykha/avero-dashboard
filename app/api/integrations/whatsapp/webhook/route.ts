import { createClient } from "@supabase/supabase-js";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function cleanPhone(value: unknown) {
  return String(value || "").replace(/\D/g, "").slice(0, 32);
}

function safeDate(value: unknown) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function clampProbability(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

async function generateJson(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing Gemini configuration");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, responseMimeType: "application/json" },
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini failed: ${response.status}`);
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

async function sendWhatsApp(phoneNumberId: string, to: string, body: string) {
  const token = process.env.META_WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("Missing META_WHATSAPP_ACCESS_TOKEN");
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: body.slice(0, 4000) } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp send failed: ${response.status} ${JSON.stringify(payload).slice(0, 300)}`);
  return payload;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) return new Response(challenge, { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const s = db();
  try {
    const payload = await request.json();
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return Response.json({ ok: true, ignored: true });

    const phoneNumberId = cleanPhone(value?.metadata?.phone_number_id);
    const from = cleanPhone(message?.from);
    const externalMessageId = String(message?.id || "").slice(0, 255);
    const customerName = String(value?.contacts?.[0]?.profile?.name || "WhatsApp Customer").slice(0, 160);
    const text = String(message?.text?.body || "").trim().slice(0, 12000);

    if (!phoneNumberId || !from || !externalMessageId) return Response.json({ ok: true, ignored: true });
    if (!text) return Response.json({ ok: true, ignored: true, reason: "Only text is enabled in Leo Vercel v1" });

    const { data: duplicate } = await s.from("conversations").select("id").eq("external_message_id", externalMessageId).maybeSingle();
    if (duplicate) return Response.json({ ok: true, duplicate: true });

    const { data: company } = await s
      .from("companies")
      .select("id,name")
      .eq("whatsapp_phone_number_id", phoneNumberId)
      .maybeSingle();
    if (!company) return Response.json({ ok: true, ignored: true, reason: "Unknown WhatsApp phone_number_id" });

    const companyId = company.id;
    const [{ data: profile }, { data: config }] = await Promise.all([
      s.from("company_ai_profiles").select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes").eq("company_id", companyId).maybeSingle(),
      s.from("ai_agent_configs").select("enabled,instructions,knowledge_scope,autonomy_mode").eq("company_id", companyId).eq("agent_key", "ai_sales").maybeSingle(),
    ]);
    if (!config?.enabled) return Response.json({ ok: true, ignored: true, reason: "Leo disabled" });

    let { data: customer } = await s.from("customers").select("*").eq("company_id", companyId).eq("phone", from).maybeSingle();
    if (!customer) {
      const inserted = await s.from("customers").insert({ company_id: companyId, name: customerName, phone: from, source: "whatsapp", lead_status: "new", interest_level: "medium", last_message_at: new Date().toISOString() }).select("*").single();
      if (inserted.error) throw inserted.error;
      customer = inserted.data;
    } else {
      await s.from("customers").update({ name: customer.name || customerName, last_message_at: new Date().toISOString() }).eq("id", customer.id);
    }

    await s.from("conversations").insert({ company_id: companyId, customer_id: customer.id, channel: "whatsapp", direction: "inbound", message: text, message_type: "text", external_message_id: externalMessageId, ai_generated: false });

    const { data: history } = await s.from("conversations").select("direction,message,created_at,ai_generated").eq("company_id", companyId).eq("customer_id", customer.id).order("created_at", { ascending: false }).limit(20);
    const conversation = [...(history || [])].reverse();

    const prompt = `You are Leo, the Sales Department Head for exactly one tenant company inside AVERO OS.\n\nCOMPANY NAME:\n${company.name}\n\nCOMPANY BRAIN:\n${JSON.stringify(profile || {})}\n\nLEO INSTRUCTIONS:\n${config.instructions || ""}\n\nKNOWLEDGE SCOPE:\n${config.knowledge_scope || "Use only this company's approved information."}\n\nCUSTOMER:\n${JSON.stringify({ id: customer.id, name: customer.name, phone: customer.phone, city: customer.city, notes: customer.notes })}\n\nRECENT CONVERSATION:\n${JSON.stringify(conversation)}\n\nLATEST MESSAGE:\n${text}\n\nReturn STRICT JSON only with this shape:\n{\n  "reply": "natural WhatsApp reply in the customer's language/dialect",\n  "lead": {\n    "title": "short opportunity title or null",\n    "service_type": "requested product/service or null",\n    "status": "new|qualified|quotation|negotiation|won|lost|null",\n    "interest_level": "low|medium|high|null",\n    "city": "city or null",\n    "appointment_date": "YYYY-MM-DD or null",\n    "people_count": 0,\n    "next_action": "next sales action or null",\n    "probability": 0,\n    "notes": "short durable memory from this message or null"\n  }\n}\n\nRules: Be human and concise. Do not repeat questions already answered. Never invent pricing, availability, offers, services, dates, stock, policies, or promises. If important information is missing, ask only one useful next question. Never mention AVERO unless the tenant company itself is AVERO.`;

    const ai = await generateJson(prompt);
    const reply = String(ai?.reply || "").trim().slice(0, 4000);
    if (!reply) throw new Error("Leo generated an empty reply");

    const leadPatch = ai?.lead || {};
    let { data: lead } = await s.from("leads").select("*").eq("company_id", companyId).eq("customer_id", customer.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const allowedStatuses = new Set(["new", "qualified", "quotation", "negotiation", "won", "lost"]);
    const status = allowedStatuses.has(String(leadPatch.status || "")) ? String(leadPatch.status) : (lead?.status || "new");
    const leadValues = {
      company_id: companyId,
      customer_id: customer.id,
      title: String(leadPatch.title || lead?.title || `WhatsApp - ${customer.name || from}`).slice(0, 200),
      service_type: leadPatch.service_type ? String(leadPatch.service_type).slice(0, 200) : lead?.service_type || null,
      status,
      interest_level: ["low", "medium", "high"].includes(String(leadPatch.interest_level || "")) ? String(leadPatch.interest_level) : lead?.interest_level || "medium",
      city: leadPatch.city ? String(leadPatch.city).slice(0, 120) : lead?.city || customer.city || null,
      appointment_date: safeDate(leadPatch.appointment_date) || lead?.appointment_date || null,
      people_count: Number.isFinite(Number(leadPatch.people_count)) && Number(leadPatch.people_count) > 0 ? Math.round(Number(leadPatch.people_count)) : lead?.people_count || null,
      notes: leadPatch.notes ? String(leadPatch.notes).slice(0, 4000) : lead?.notes || null,
      updated_at: new Date().toISOString(),
      lead_source: "whatsapp",
      next_action: leadPatch.next_action ? String(leadPatch.next_action).slice(0, 500) : lead?.next_action || null,
      probability: clampProbability(leadPatch.probability) ?? lead?.probability ?? 0,
      last_contact_at: new Date().toISOString(),
    };

    if (lead) {
      const updated = await s.from("leads").update(leadValues).eq("id", lead.id).select("*").single();
      if (!updated.error) lead = updated.data;
    } else {
      const inserted = await s.from("leads").insert(leadValues).select("*").single();
      if (!inserted.error) lead = inserted.data;
    }

    const sent = await sendWhatsApp(phoneNumberId, from, reply);
    const sentId = String(sent?.messages?.[0]?.id || "").slice(0, 255) || null;
    await s.from("conversations").insert({ company_id: companyId, customer_id: customer.id, channel: "whatsapp", direction: "outbound", message: reply, message_type: "text", external_message_id: sentId, ai_generated: true });
    await s.from("ai_agent_runs").insert({ company_id: companyId, agent_key: "ai_sales", action: "whatsapp_reply", status: "completed", input: { customer_id: customer.id, message_id: externalMessageId, message: text }, output: { customer_id: customer.id, lead_id: lead?.id || null, reply, sent_message_id: sentId, source: "vercel_native" }, completed_at: new Date().toISOString() });

    return Response.json({ ok: true, source: "vercel_native", company_id: companyId, customer_id: customer.id, lead_id: lead?.id || null, sent_message_id: sentId });
  } catch (error) {
    console.error("Leo WhatsApp Vercel engine error", error);
    return Response.json({ ok: false, error: "Leo WhatsApp processing failed" }, { status: 500 });
  }
}
