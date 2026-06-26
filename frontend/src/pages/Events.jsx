import { card } from "../lib/ui";

const ACTION_COLOR = {
  block: { bg: "bg-red-500/10", text: "text-red-500" },
  auto_block: { bg: "bg-red-500/10", text: "text-red-500" },
  limit: { bg: "bg-amber-500/10", text: "text-amber-500" },
  unblock: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  throttle: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  unthrottle: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
};

export default function Events({ events }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[color:var(--c-text-1)] tracking-tight m-0">Events</h1>
        <p className="text-[13px] text-[color:var(--c-text-3)] mt-1 mb-0">System event log</p>
      </div>
      <div className={`${card} overflow-hidden`}>
        {events.map((e, i) => {
          const t = new Date(e.timestamp * 1000).toLocaleTimeString();
          const colors = ACTION_COLOR[e.action] || ACTION_COLOR.unblock;
          return (
            <div key={i} className="px-5 py-3 border-b border-[var(--c-row-border)] flex items-center gap-3.5 hover:bg-[var(--c-row-hover)] transition-colors duration-150">
              <span className={`px-2 py-[3px] rounded text-[11px] font-bold tracking-wide uppercase inline-block min-w-[62px] text-center ${colors.bg} ${colors.text}`}>{e.action}</span>
              <span className="font-mono text-xs text-[color:var(--c-text-2)] flex-shrink-0 min-w-[128px]">{e.process_name}</span>
              <span className="text-[13px] text-[color:var(--c-text-3)] flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">{e.detail}</span>
              <span className="font-mono text-[11px] text-[color:var(--c-text-4)] flex-shrink-0">{t}</span>
            </div>
          );
        })}
        {events.length === 0 && <div className="p-8 text-center text-[color:var(--c-text-3)]">No events recorded.</div>}
      </div>
    </div>
  );
}
