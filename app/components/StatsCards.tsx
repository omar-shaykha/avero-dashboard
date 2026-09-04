"use client";

interface StatsCardsProps {
  totalLeads: number;
  qualifiedCount: number;
  quotationsCount: number;
  negotiationsCount: number;
  wonCount: number;
  lostCount: number;
}

const ICONS: Record<string, string> = {
  total: "👥",
  qualified: "✓",
  quotation: "📋",
  negotiation: "💼",
  won: "🏆",
  lost: "✕",
};

const COLORS: Record<
  string,
  { bg: string; border: string; icon: string }
> = {
  total: {
    bg: "bg-blue-900/20",
    border: "border-blue-800",
    icon: "text-blue-400",
  },
  qualified: {
    bg: "bg-green-900/20",
    border: "border-green-800",
    icon: "text-green-400",
  },
  quotation: {
    bg: "bg-amber-900/20",
    border: "border-amber-800",
    icon: "text-amber-400",
  },
  negotiation: {
    bg: "bg-purple-900/20",
    border: "border-purple-800",
    icon: "text-purple-400",
  },
  won: { bg: "bg-emerald-900/20", border: "border-emerald-800", icon: "text-emerald-400" },
  lost: {
    bg: "bg-red-900/20",
    border: "border-red-800",
    icon: "text-red-400",
  },
};

const statsData = [
  {
    label: "Total Leads",
    value: "totalLeads",
    colorKey: "total",
    metric: "+100%",
  },
  { label: "Qualified", value: "qualifiedCount", colorKey: "qualified", metric: "0%" },
  {
    label: "Quotations",
    value: "quotationsCount",
    colorKey: "quotation",
    metric: "50%",
  },
  {
    label: "Negotiations",
    value: "negotiationsCount",
    colorKey: "negotiation",
    metric: "0%",
  },
  { label: "Won", value: "wonCount", colorKey: "won", metric: "0%" },
  { label: "Lost", value: "lostCount", colorKey: "lost", metric: "0%" },
];

export default function StatsCards({
  totalLeads,
  qualifiedCount,
  quotationsCount,
  negotiationsCount,
  wonCount,
  lostCount,
}: StatsCardsProps) {
  const values: Record<string, number> = {
    totalLeads,
    qualifiedCount,
    quotationsCount,
    negotiationsCount,
    wonCount,
    lostCount,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 px-6 py-4">
      {statsData.map((stat) => {
        const colorConfig = COLORS[stat.colorKey];
        const count = values[stat.value];
        return (
          <div
            key={stat.label}
            className={`${colorConfig.bg} border ${colorConfig.border} rounded-lg p-4`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.metric}</p>
              </div>
              <div className={`text-2xl ${colorConfig.icon}`}>
                {ICONS[stat.colorKey]}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
