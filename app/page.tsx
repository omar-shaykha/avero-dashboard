import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  const {
    count: totalCustomers,
    error: customersError,
  } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const {
    count: hotLeads,
    error: hotLeadsError,
  } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("interest_level", "High");

  const {
    count: quotations,
    error: quotationsError,
  } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "quotation");

  console.log("SUPABASE DEBUG", {
    totalCustomers,
    customersError,
    hotLeads,
    hotLeadsError,
    quotations,
    quotationsError,
  });

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">AVERO</h1>
        <p className="mt-2 text-zinc-400">AI Sales Dashboard</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Customers</p>
            <p className="mt-2 text-4xl font-semibold">
              {totalCustomers ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Hot Leads</p>
            <p className="mt-2 text-4xl font-semibold">
              {hotLeads ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Quotations</p>
            <p className="mt-2 text-4xl font-semibold">
              {quotations ?? 0}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
