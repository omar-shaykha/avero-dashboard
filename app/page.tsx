export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-4xl font-bold">AVERO</h1>
      <p className="mt-2 text-zinc-400">AI Sales Dashboard</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-400">Total Customers</p>
          <p className="mt-2 text-4xl font-semibold">—</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-400">Hot Leads</p>
          <p className="mt-2 text-4xl font-semibold">—</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-400">Quotations</p>
          <p className="mt-2 text-4xl font-semibold">—</p>
        </div>
      </div>
    </main>
  );
}
