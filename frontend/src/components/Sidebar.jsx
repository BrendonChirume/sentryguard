import NavIcon from "./NavIcon";
import logoMark from "../assets/mark-128.png";

const NAV_ITEMS = [
  ["dashboard", "Dashboard"],
  ["apps", "Applications"],
  ["rules", "Rules"],
  ["events", "Events"],
  ["settings", "Settings"],
];

export default function Sidebar({ page, onNavigate, connected }) {
  return (
    <aside className="w-[220px] min-w-[220px] glass border-y-0 border-l-0 rounded-none flex flex-col h-full flex-shrink-0 overflow-hidden">
      <div className="px-4 py-[18px] border-b border-white/10 flex items-center gap-2.5">
        <img src={logoMark} alt="" className="w-8 h-8 flex-shrink-0 drop-shadow-[0_2px_8px_rgba(59,130,246,0.45)]" />
        <span className="text-[15px] font-bold text-slate-100 tracking-tight">SentryGuard</span>
      </div>

      <nav className="flex-1 p-2 flex flex-col gap-1 overflow-auto">
        {NAV_ITEMS.map(([id, label]) => {
          const active = page === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex items-center gap-2.5 px-3 py-[9px] rounded-xl cursor-pointer text-sm border w-full text-left transition-colors duration-150 ${
                active
                  ? "bg-blue-500/15 text-blue-300 font-medium border-blue-400/20 shadow-[0_2px_12px_rgba(59,130,246,0.2)]"
                  : "bg-transparent text-slate-400 font-normal border-transparent hover:bg-white/[0.06] hover:text-slate-200"
              }`}
            >
              <NavIcon id={id} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3.5 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className={`animate-lpulse w-[7px] h-[7px] rounded-full flex-shrink-0 ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-slate-600"}`} />
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-px">Backend</div>
            <div className={`text-xs font-medium ${connected ? "text-emerald-400" : "text-slate-500"}`}>{connected ? "Connected" : "Disconnected"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
