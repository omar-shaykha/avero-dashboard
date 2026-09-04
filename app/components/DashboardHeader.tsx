"use client";

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
}

export default function DashboardHeader({
  userName,
  userEmail,
}: DashboardHeaderProps) {
  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userEmail?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
      <div />
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m6.364 1.636l-.707-.707M21 12h-1m1.364 6.364l-.707-.707M12 21v1m-6.364-1.636l.707-.707M3 12h1M3.636 5.636l.707-.707"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-slate-300">Online</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">
          {initials}
        </div>

        <div className="flex flex-col">
          <p className="text-sm font-medium text-white">
            {userName || userEmail || "User"}
          </p>
        </div>

        <button className="p-1 hover:bg-slate-800 rounded transition-colors">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
