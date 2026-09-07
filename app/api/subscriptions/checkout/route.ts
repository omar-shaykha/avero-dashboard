import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";

const plans = {
  starter: { name: "Starter OS", setup_fee: 1500, monthly_fee: 499 },
  growth: { name: "Growth OS", setup_fee: 3500, monthly_fee: 999 },
  pro: { name: "Pro Operations OS", setup_fee: 7500, monthly_fee: 1999 },
  enterprise: { name: "Enterprise AI OS", setup_fee: 15000, monthly_fee: 3999 },
} as const;

const methods = ["mada", "visa", "paypal", "apple_pay"] as const;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const planKey = String(body.plan_key || "").trim() as keyof typeof plans;
    const paymentMethod = String(body.payment_method || "").trim() as (typeof methods)[number];
    const billingCycle = String(body.billing_cycle || "monthly") === "yearly" ? "yearly" : "monthly";

    if (!(planKey in plans)) return Response.json({ error: "Invalid plan" }, { status: 400 });
    if (!methods.includes(paymentMethod)) return Response.json({ error: "Invalid payment method" }, { status: 400 });

    const plan = plans[planKey];
    const s = db();
    const { data, error } = await s
      .from("subscription_checkout_requests")
      .insert({
        company_id: ctx.profile.company_id,
        user_id: ctx.user.id,
        plan_key: planKey,
        plan_name: plan.name,
        setup_fee: plan.setup_fee,
        monthly_fee: plan.monthly_fee,
        currency: "SAR",
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        status: "pending_gateway_setup",
        metadata: {
          source: "dashboard_subscriptions",
          selected_at: new Date().toISOString(),
          note: "Payment gateway is not connected yet. Replace pending_gateway_setup with real checkout provider once Mada/Visa/Apple Pay/PayPal gateway credentials are configured.",
        },
      })
      .select("id,status,plan_key,plan_name,payment_method,setup_fee,monthly_fee,currency,billing_cycle,created_at")
      .single();

    if (error) return Response.json({ error: "Could not create checkout request" }, { status: 500 });

    return Response.json({
      ok: true,
      checkout_request: data,
      status: "pending_gateway_setup",
      message: "Subscription request saved. Connect a real payment gateway before collecting money.",
      checkout_url: null,
    });
  } catch (error) {
    console.error("Subscription checkout error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
