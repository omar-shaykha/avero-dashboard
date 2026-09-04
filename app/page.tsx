import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import LeadPipeline from "@/app/components/LeadPipeline";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Check authentication
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // CRM data client (service-role)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: hotLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("interest_level", "High");

  const { count: quotations } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "quotation");

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(`
      id,
      title,
      service_type,
      status,
      interest_level,
      people_count,
      event_date,
      city,
      notes,
      updated_at,
      customers (
        name,
        phone,
        email
      )
    `)
    .order("updated_at", { ascending: false });

  console.log("LEADS ERROR:", leadsError);

  const normalizedLeads = (leads || []).map((lead: any) => ({
    ...lead,
    customers: Array.isArray(lead.customers)
      ? lead.customers[0] || null
      : lead.customers || null,
  }));

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AVERO</h1>
          <p className="mt-2 text-zinc-400">AI Sales Dashboard</p>
        </div>

        {/* Stats */}
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

        {/* Leads */}
        <div className="mt-12">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">Leads</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Latest sales opportunities from AVERO AI
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left text-sm">

              <thead className="border-b border-zinc-800 text-zinc-400">
                <tr>
                  <th className="p-4 font-medium">Customer</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Service</th>
                  <th className="p-4 font-medium">City</th>
                  <th className="p-4 font-medium">People</th>
                  <th className="p-4 font-medium">Interest</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Event Date</th>
                </tr>
              </thead>

              <tbody>
                {leads && leads.length > 0 ? (
                  leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      className="border-b border-zinc-900 last:border-0"
                    >
                      <td className="p-4 font-medium">
                        {Array.isArray(lead.customers)
                          ? lead.customers[0]?.name || "Unknown"
                          : lead.customers?.name || "Unknown"}
                      </td>

                      <td className="p-4 text-zinc-400">
                        {Array.isArray(lead.customers)
                          ? lead.customers[0]?.phone || "-"
                          : lead.customers?.phone || "-"}
                      </td>

                      <td className="p-4 text-zinc-400">
                        {Array.isArray(lead.customers)
                          ? lead.customers[0]?.email || "-"
                          : lead.customers?.email || "-"}
                      </td>

                      <td className="p-4">
                        {lead.service_type || "-"}
                      </td>

                      <td className="p-4">
                        {lead.city || "-"}
                      </td>

                      <td className="p-4">
                        {lead.people_count ?? "-"}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">
                          {lead.interest_level || "-"}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs capitalize">
                          {lead.status || "new"}
                        </span>
                      </td>

                      <td className="p-4 text-zinc-400">
                        {lead.event_date || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-10 text-center text-zinc-500"
                    >
                      No leads found
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </div>

        {/* Sales Pipeline */}
        <LeadPipeline leads={normalizedLeads} />

      </div>
    </main>
  );
}
