import StatCard from "../components/StatCard";
import HistoryChart from "../components/HistoryChart";
import ProcessTable from "../components/ProcessTable";
import { formatBytes, formatSpeed } from "../lib/format";
import { card, sectionLabel } from "../lib/ui";

export default function Dashboard({ apps, top5, totalUsedMb, totalRate, blkCnt, limCnt, history, pollSeconds, onAction }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight m-0">Dashboard</h1>
        <p className="text-[13px] text-slate-600 mt-1 mb-0">Real-time network usage overview</p>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Total Today"
          value={formatBytes(totalUsedMb)}
          colorClass="text-slate-100"
          bgClass="bg-blue-500/10"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
        />
        <StatCard
          label="Live Rate"
          value={formatSpeed(totalRate)}
          colorClass="text-emerald-500"
          bgClass="bg-emerald-500/10"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
        />
        <StatCard
          label="Apps Blocked"
          value={blkCnt}
          colorClass="text-red-500"
          bgClass="bg-red-500/10"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>}
        />
        <StatCard
          label="Apps Throttled"
          value={limCnt}
          colorClass="text-amber-500"
          bgClass="bg-amber-500/10"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>}
        />
      </div>

      <div className={`${card} p-4.5 mb-5`}>
        <div className={`${sectionLabel} mb-3.5`}>Data Usage — Top 5 Apps</div>
        <div className="flex h-[22px] rounded-[5px] overflow-hidden bg-black/25 mb-3 gap-px">
          {top5.map((t, i) => (
            <div key={i} title={t.name} className="h-full transition-[width] duration-500 ease-out min-w-[3px] flex-shrink-0" style={{ width: `${t.percent.toFixed(2)}%`, background: t.color }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {top5.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-[9px] h-[9px] rounded-full flex-shrink-0" style={{ background: t.color }} />
              <span className="text-xs text-slate-400">{t.name}</span>
              <span className="font-mono text-xs text-slate-600">{formatBytes(t.total_mb)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} p-4.5 mb-5`}>
        <div className={`${sectionLabel} mb-3.5`}>Total Usage — Last 24h</div>
        <HistoryChart history={history} />
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="px-4.5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <span className={sectionLabel}>Active Processes</span>
          <div className="flex items-center gap-1.5">
            <div className="animate-lpulse w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-700">Live · {pollSeconds}s</span>
          </div>
        </div>
        <ProcessTable apps={apps} onAction={onAction} limit={6} />
      </div>
    </div>
  );
}
