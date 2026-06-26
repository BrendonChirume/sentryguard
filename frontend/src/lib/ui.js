export const card = "glass rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25)]";
export const modalOverlay = "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[999]";
export const modalPanel = "glass-strong rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,.55)]";
export const cardHover = "glass rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-colors duration-200 hover:bg-[var(--c-surface-3)]";
export const sectionLabel = "text-[11px] font-semibold text-[color:var(--c-text-2)] uppercase tracking-wider";
export const th = "px-4 py-[9px] text-left text-[11px] font-semibold text-[color:var(--c-text-2)] uppercase tracking-wide whitespace-nowrap";
export const td = "px-4 py-[11px]";
export const inputStyle = "w-full bg-[var(--c-surface-2)] border border-[var(--c-border-10)] rounded-lg px-2.5 py-2 text-[color:var(--c-text-1)] text-sm outline-none box-border transition-colors duration-150 focus:border-blue-400/50 focus:bg-[var(--c-surface-3)] placeholder:text-[color:var(--c-text-3)]";
export const label = "block text-[11px] font-semibold text-[color:var(--c-text-2)] uppercase tracking-wide mb-1.5";
export const btnPrimary = "bg-blue-500/90 text-white border border-blue-400/30 rounded-xl px-4 py-2 text-[13px] font-medium cursor-pointer shadow-[0_4px_16px_rgba(59,130,246,0.35)] backdrop-blur-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-[0_4px_20px_rgba(59,130,246,0.5)]";
export const btnGhost = "bg-[var(--c-surface-1)] text-[color:var(--c-text-2)] border border-[var(--c-border-10)] rounded-xl px-4 py-2 text-[13px] font-medium cursor-pointer backdrop-blur-sm transition-colors duration-150 hover:bg-[var(--c-surface-3)]";
export const btnDanger = "bg-red-500/5 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 text-[13px] font-medium cursor-pointer backdrop-blur-sm transition-colors duration-150 hover:bg-red-500/15";

export function smBtnClass(colorClass, borderClass) {
  return `bg-[var(--c-surface-1)] ${colorClass} ${borderClass} border rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer backdrop-blur-sm transition-colors duration-150 hover:bg-[var(--c-surface-3)]`;
}
