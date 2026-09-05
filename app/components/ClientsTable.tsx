"use client";

interface Company {
  id: string;
  name: string;
  phone_number_id?: string;
  created_at: string;
}

interface ClientsTableProps {
  companies: Company[];
}

export default function ClientsTable({ companies }: ClientsTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (companies.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-lg">
        <p className="text-slate-400">No clients yet. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-slate-900/50 border border-slate-800 rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-800/50">
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
              Company Name
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
              Company ID
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
              WhatsApp Phone ID
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">
              Created Date
            </th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr
              key={company.id}
              className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
            >
              <td className="px-6 py-4 text-sm text-white font-medium">
                {company.name}
              </td>
              <td className="px-6 py-4 text-sm text-slate-300 font-mono text-xs">
                {company.id}
              </td>
              <td className="px-6 py-4 text-sm text-slate-300">
                {company.phone_number_id || "—"}
              </td>
              <td className="px-6 py-4 text-sm text-slate-400">
                {formatDate(company.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}