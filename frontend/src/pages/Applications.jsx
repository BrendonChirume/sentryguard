import ProcessTable from "../components/ProcessTable";
import { card, inputStyle } from "../lib/ui";

const FILTERS = [["all", "All"], ["high", "High Usage"], ["blocked", "Blocked"], ["limited", "Limited"]];

export default function Applications({ apps, search, onSearchChange, appFilter, onFilterChange, onAction }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight m-0">Applications</h1>
        <p className="text-[13px] text-slate-600 mt-1 mb-0">Manage per-application network access</p>
      </div>
      <div className="flex items-center gap-2.5 mb-4.5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or .exe…"
            className={`${inputStyle} pl-[30px]`}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map(([k, fLabel]) => (
            <button
              key={k}
              type="button"
              onClick={() => onFilterChange(k)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-medium cursor-pointer border ${
                appFilter === k ? "bg-blue-500/15 text-blue-300 border-blue-400/25" : "bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/[0.07]"
              }`}
            >
              {fLabel}
            </button>
          ))}
        </div>
      </div>
      <div className={`${card} overflow-hidden`}>
        <ProcessTable apps={apps} onAction={onAction} />
      </div>
    </div>
  );
}
