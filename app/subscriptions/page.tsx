"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { CheckCircle2, Clock3, CreditCard, Crown, Rocket, ShieldCheck, Sparkles, WalletCards, Zap } from "lucide-react";

type Plan = {
  key: "starter" | "growth" | "pro" | "enterprise";
  name: string;
  badge: string;
  headline: string;
  execution: string;
  setup: number;
  monthly: number;
  best?: boolean;
  icon: typeof Rocket;
  features: string[];
  includes: string[];
};

const plans: Plan[] = [
  {
    key: "starter",
    name: "Starter OS",
    badge: "For first client",
    headline: "Basic dashboard + CRM + 2 AI agents",
    execution: "3–5 working days",
    setup: 1500,
    monthly: 499,
    icon: Rocket,
    features: ["CRM leads pipeline", "Leo Sales Agent", "Foxy Marketing drafts", "Basic company brain", "User access control", "Approval queue"],
    includes: ["Initial setup", "1 admin user", "Facebook + Instagram connection guidance", "Basic onboarding"],
  },
  {
    key: "growth",
    name: "Growth OS",
    badge: "Most sellable",
    headline: "Full sales + marketing operations for growing teams",
    execution: "5–8 working days",
    setup: 3500,
    monthly: 999,
    best: true,
    icon: Sparkles,
    features: ["Everything in Starter", "4 AI agents", "Marketing Brand Kit", "Daily content drafts", "WhatsApp lead capture", "Sales follow-up flow", "Reports and activity runs"],
    includes: ["AI team setup", "3 users", "Social channels setup", "1 training session", "Weekly optimization check"],
  },
  {
    key: "pro",
    name: "Pro Operations OS",
    badge: "For serious operation",
    headline: "Sales, marketing, support, inventory and analytics",
    execution: "8–14 working days",
    setup: 7500,
    monthly: 1999,
    icon: Zap,
    features: ["Everything in Growth", "8 AI agents", "Support inbox", "Inventory + warehouse rooms", "Advanced permissions", "Client Launch Center", "Operational KPI dashboard", "Repost library"],
    includes: ["Custom company brain", "10 users", "Workflow tuning", "AI worker roles", "Monthly business review"],
  },
  {
    key: "enterprise",
    name: "Enterprise AI OS",
    badge: "Custom build",
    headline: "Multi-branch / multi-client operating system",
    execution: "14–30 working days",
    setup: 15000,
    monthly: 3999,
    icon: Crown,
    features: ["Everything in Pro", "Custom integrations", "Multi-branch setup", "Custom dashboards", "Dedicated automations", "Advanced data model", "Priority support", "White-label options"],
    includes: ["Discovery workshop", "Unlimited AI worker design", "Custom Make scenarios", "Admin training", "Go-live support"],
  },
];

const paymentMethods = [
  { key: "mada", label: "Mada", note: "Saudi debit card" },
  { key: "visa", label: "Visa / Mastercard", note: "Card payment" },
  { key: "apple_pay", label: "Apple Pay", note: "Fast mobile checkout" },
  { key: "paypal", label: "PayPal", note: "PayPal account/card" },
] as const;

export default function SubscriptionsPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]["key"]>("mada");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startCheckout() {
    if (!selectedPlan) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_key: selectedPlan.key, payment_method: paymentMethod, billing_cycle: billingCycle }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(response.ok ? `Request saved for ${selectedPlan.name}. Payment gateway connection is the next step.` : data.error || "Could not start checkout.");
  }

  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar /><div className="ml-64 min-h-screen"><DashboardHeader /><main className="p-4 md:p-7"><div className="mx-auto max-w-[1500px] space-y-6">
    <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,.14),transparent_34%),#020617] p-6 shadow-2xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">AVERO OS Subscriptions</p><h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Packages clients can understand</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Clear setup cost, monthly subscription, included features, implementation time and payment options. This page is ready for sales demos and future payment gateway connection.</p></div><div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"><ShieldCheck className="mb-2" /> Easy buying flow: choose plan → subscribe → select payment method.</div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-4">{plans.map((plan) => <PlanCard key={plan.key} plan={plan} onSubscribe={() => { setSelectedPlan(plan); setMessage(""); }} />)}</section>

    <section className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5"><div className="flex items-center gap-3"><WalletCards className="text-cyan-300" /><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Payment Methods</p><h2 className="text-2xl font-black">Mada, cards, Apple Pay and PayPal</h2></div></div><p className="mt-3 text-sm leading-7 text-slate-400">The checkout screen is ready. Real money collection still needs a live payment gateway connection and credentials before launch.</p></section>
  </div></main></div>

  {selectedPlan && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Subscribe</p><h2 className="mt-1 text-3xl font-black">{selectedPlan.name}</h2><p className="mt-2 text-sm text-slate-400">Setup {money(selectedPlan.setup)} + monthly {money(selectedPlan.monthly)}</p></div><button onClick={() => setSelectedPlan(null)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{paymentMethods.map((method) => <button key={method.key} onClick={() => setPaymentMethod(method.key)} className={`rounded-2xl border p-4 text-left transition ${paymentMethod === method.key ? "border-cyan-300 bg-cyan-400/10" : "border-slate-800 bg-slate-900/60"}`}><CreditCard className="mb-3 text-cyan-300" /><p className="font-black text-white">{method.label}</p><p className="mt-1 text-xs text-slate-500">{method.note}</p></button>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => setBillingCycle("monthly")} className={`rounded-2xl border p-4 text-left ${billingCycle === "monthly" ? "border-violet-300 bg-violet-400/10" : "border-slate-800 bg-slate-900/60"}`}><p className="font-bold">Monthly</p><p className="text-sm text-slate-400">Pay every month</p></button><button onClick={() => setBillingCycle("yearly")} className={`rounded-2xl border p-4 text-left ${billingCycle === "yearly" ? "border-violet-300 bg-violet-400/10" : "border-slate-800 bg-slate-900/60"}`}><p className="font-bold">Yearly</p><p className="text-sm text-slate-400">Annual billing request</p></button></div>{message && <div className="mt-4 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</div>}<button onClick={startCheckout} disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><CreditCard size={18} /> {loading ? "Saving request..." : "Continue to payment"}</button><p className="mt-3 text-center text-xs text-slate-500">Gateway status: pending setup until payment provider keys are connected.</p></div></div>}
  </div>;
}

function PlanCard({ plan, onSubscribe }: { plan: Plan; onSubscribe: () => void }) {
  const Icon = plan.icon;
  return <article className={`relative rounded-3xl border p-5 ${plan.best ? "border-cyan-300/60 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,.12)]" : "border-slate-800 bg-slate-900/65"}`}>
    {plan.best && <span className="absolute right-4 top-4 rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-black text-slate-950">Recommended</span>}
    <Icon className="text-cyan-300" /><p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">{plan.badge}</p><h2 className="mt-2 text-2xl font-black">{plan.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{plan.headline}</p>
    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-sm text-slate-300"><Clock3 size={15} /> Execution: <b className="text-white">{plan.execution}</b></div><p className="mt-3 text-3xl font-black">{money(plan.monthly)}<span className="text-sm font-semibold text-slate-500"> / month</span></p><p className="mt-1 text-sm text-slate-400">Setup: {money(plan.setup)}</p></div>
    <div className="mt-5 space-y-2">{plan.features.map((feature) => <Feature key={feature} text={feature} />)}</div>
    <div className="mt-5 border-t border-slate-800 pt-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Comes with</p><div className="mt-2 space-y-2">{plan.includes.map((item) => <Feature key={item} text={item} muted />)}</div></div>
    <button onClick={onSubscribe} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300"><CreditCard size={16} /> Subscribe</button>
  </article>;
}

function Feature({ text, muted = false }: { text: string; muted?: boolean }) { return <div className="flex items-start gap-2 text-sm"><CheckCircle2 size={16} className={muted ? "mt-0.5 text-slate-500" : "mt-0.5 text-emerald-300"} /><span className={muted ? "text-slate-400" : "text-slate-200"}>{text}</span></div>; }
function money(value: number) { return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(value); }
