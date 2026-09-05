export default function AveroBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-blue-400/25 bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-violet-500/20 shadow-[0_0_28px_rgba(59,130,246,0.18)]">
        <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
          <defs>
            <linearGradient id="avero-mark" x1="6" y1="34" x2="34" y2="6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22D3EE" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <path d="M8.5 30.5 17.2 9.8c1.1-2.6 4.8-2.6 5.9 0l8.4 20.7" fill="none" stroke="url(#avero-mark)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.8 24h12.4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.95"/>
          <circle cx="30.8" cy="10.5" r="2.2" fill="#22D3EE"/>
        </svg>
      </div>
      {!compact && (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[1.38rem] font-black tracking-[0.16em] text-white">AVERO</span>
            <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-cyan-300">AI</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Intelligent Operations</p>
        </div>
      )}
    </div>
  );
}
