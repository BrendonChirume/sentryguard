import { appColor, formatBytes, formatSpeed, statusBadgeClass } from "../lib/format";
import { th, td } from "../lib/ui";
import ActionButtons from "./ActionButtons";

export default function ProcessTable({ apps, onAction, limit }) {
  const rows = limit ? apps.slice(0, limit) : apps;

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-white/[0.03]">
            <th className={th}>App</th>
            <th className={th}>Process</th>
            <th className={`${th} text-right`}>Live Rate</th>
            <th className={`${th} text-right`}>Total Used</th>
            <th className={`${th} text-center`}>Status</th>
            <th className={`${th} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.pid} className="border-b border-white/[0.06] hover:bg-white/[0.025] transition-colors duration-150">
              <td className={td}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: appColor(p.name) }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-[13px] font-medium text-[#e2e8f0]">{p.name}</span>
                </div>
              </td>
              <td className={td}><span className="font-mono text-xs text-slate-500">{p.pid}</span></td>
              <td className={`${td} text-right`}><span className="font-mono text-[13px] text-slate-300">{formatSpeed(p.speed)}</span></td>
              <td className={`${td} text-right`}><span className="font-mono text-[13px] text-slate-300">{formatBytes(p.total_mb)}</span></td>
              <td className={`${td} text-center`}>
                <span className={`px-2 py-[3px] rounded text-[11px] font-semibold tracking-wide uppercase inline-block ${statusBadgeClass(p.status)}`}>{p.status}</span>
              </td>
              <td className={td}><ActionButtons app={p} onAction={onAction} /></td>
            </tr>
          ))}
          {apps.length === 0 && (
            <tr><td colSpan="6" className="p-8 text-center text-slate-500">No applications found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
