import { RadioGroup, Radio } from "@headlessui/react";
import StatCard from "../components/StatCard";
import HistoryChart from "../components/HistoryChart";
import ProcessTable from "../components/ProcessTable";
import GlobalLimitCard from "../components/GlobalLimitCard";
import { formatBytes, formatSpeed } from "../lib/format";
import { card, sectionLabel } from "../lib/ui";

const RANGE_OPTIONS = [
  { hours: 24, label: "24h" },
  { hours: 168, label: "7d" },
  { hours: 720, label: "30d" },
];

export default function Dashboard({ apps, top5, totalUsedMb, totalRate, blkCnt, limCnt, history, historyHours, onHistoryHoursChange, globalUsage, globalLimitMb, globalLimitPeriod, onUpdateSettings, pollSeconds, onAction }) {
  const rangeLabel = RANGE_OPTIONS.find((r) => r.hours === historyHours)?.label ?? "24h";
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[color:var(--c-text-1)] tracking-tight m-0">Dashboard</h1>
        <p className="text-[13px] text-[color:var(--c-text-3)] mt-1 mb-0">Real-time network usage overview</p>
      </div>

      <GlobalLimitCard
        totalMb={totalUsedMb}
        limitMb={globalLimitMb}
        period={globalLimitPeriod}
        periodStart={globalUsage?.period_start}
        onUpdate={onUpdateSettings}
      />

      <div className="grid grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Total Today"
          value={formatBytes(totalUsedMb)}
          colorClass="text-[color:var(--c-text-1)]"
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
        <div className="flex h-5.5 rounded-[5px] overflow-hidden bg-[var(--c-inset-bg)] mb-3 gap-px">
          {top5.map((t, i) => (
            <div key={i} title={t.name} className="h-full transition-[width] duration-500 ease-out min-w-0.75 shrink-0" style={{ width: `${t.percent.toFixed(2)}%`, background: t.color }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {top5.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2.25 h-2.25 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="text-xs text-[color:var(--c-text-2)]">{t.name}</span>
              <span className="font-mono text-xs text-[color:var(--c-text-3)]">{formatBytes(t.total_mb)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${card} p-4.5 mb-5`}>
        <div className="flex items-center justify-between mb-3.5">
          <div className={sectionLabel}>Total Usage — Last {rangeLabel}</div>
          <RadioGroup value={historyHours} onChange={onHistoryHoursChange} className="flex gap-1 bg-[var(--c-inset-bg)] rounded-lg p-0.5">
            {RANGE_OPTIONS.map((r) => (
              <Radio
                key={r.hours}
                value={r.hours}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide cursor-pointer text-[color:var(--c-text-3)] data-checked:bg-blue-500/15 data-checked:text-blue-300"
              >
                {r.label}
              </Radio>
            ))}
          </RadioGroup>
        </div>
        <HistoryChart history={history} rangeHours={historyHours} />
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="px-4.5 py-3.5 border-b border-[var(--c-border-10)] flex items-center justify-between">
          <span className={sectionLabel}>Active Processes</span>
          <div className="flex items-center gap-1.5">
            <div className="animate-lpulse w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-[color:var(--c-text-4)]">Live · {pollSeconds}s</span>
          </div>
        </div>
        <ProcessTable apps={apps} onAction={onAction} limit={6} />
      </div>
    </div>
  );
}
