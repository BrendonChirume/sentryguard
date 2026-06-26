import { useMemo, useState } from "react";
import { appColor, formatBytes, formatSpeed, statusBadgeClass, forecastStatus } from "../lib/format";
import { th, td } from "../lib/ui";
import ActionButtons from "./ActionButtons";

const COLUMNS = [
  { key: "name", label: "App", align: "left" },
  { key: "pid", label: "Process", align: "left" },
  { key: "speed", label: "Live Rate", align: "right" },
  { key: "total_mb", label: "Total Used", align: "right" },
  { key: "status", label: "Status", align: "center" },
  { key: null, label: "Actions", align: "right" },
];

function SortIcon({ direction }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`inline-block ml-1 transition-transform duration-150 ${direction === "desc" ? "rotate-180" : ""}`}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ForecastBadge({ totalMb, limitMb }) {
  const forecast = forecastStatus(totalMb, limitMb);
  if (!forecast) return null;
  return (
    <span
      title={forecast === "exceed" ? "On pace to exceed today's limit" : "On track to stay under today's limit"}
      className={`px-1.5 py-[2px] rounded text-[10px] font-semibold tracking-wide uppercase inline-block ${
        forecast === "exceed" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
      }`}
    >
      {forecast === "exceed" ? "Will exceed" : "On track"}
    </span>
  );
}

export default function ProcessTable({ apps, onAction, limit }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return apps;
    return [...apps].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [apps, sortKey, sortDir]);

  const rows = limit ? sorted.slice(0, limit) : sorted;

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse min-w-[640px]">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--c-surface-1)] backdrop-blur-md">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`${th} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""} ${col.key ? "cursor-pointer select-none hover:text-[color:var(--c-text-1)]" : ""}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && <SortIcon direction={sortDir} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.pid} className="border-b border-[var(--c-row-border)] hover:bg-[var(--c-row-hover)] transition-colors duration-150">
              <td className={td}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: appColor(p.name) }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-medium text-[color:var(--c-text-1)]">{p.name}</span>
                </div>
              </td>
              <td className={td}><span className="font-mono text-xs text-[color:var(--c-text-3)]">{p.pid}</span></td>
              <td className={`${td} text-right`}><span className="font-mono text-[13px] text-[color:var(--c-text-2)]">{formatSpeed(p.speed)}</span></td>
              <td className={`${td} text-right`}><span className="font-mono text-[13px] text-[color:var(--c-text-2)]">{formatBytes(p.total_mb)}</span></td>
              <td className={`${td} text-center`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`px-2 py-[3px] rounded text-[11px] font-semibold tracking-wide uppercase inline-block ${statusBadgeClass(p.status)}`}>{p.status}</span>
                  <ForecastBadge totalMb={p.total_mb} limitMb={p.limitMb} />
                </div>
              </td>
              <td className={td}><ActionButtons app={p} onAction={onAction} /></td>
            </tr>
          ))}
          {apps.length === 0 && (
            <tr><td colSpan="6" className="p-8 text-center text-[color:var(--c-text-3)]">No applications found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
