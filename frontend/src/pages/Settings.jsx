import ToggleSwitch from "../components/ToggleSwitch";
import KnownNetworks from "../components/KnownNetworks";
import { card } from "../lib/ui";
import logoMark from "../assets/mark-128.png";

const numberFieldClass = "bg-[var(--c-surface-2)] border border-[var(--c-border-10)] rounded-lg py-1.5 px-2.5 text-[color:var(--c-text-1)] text-sm font-medium text-center outline-none font-mono focus:border-blue-400/50 focus:bg-[var(--c-surface-3)] transition-colors duration-150";

export default function Settings({ settings, onUpdate, networkStatus }) {
  return (
    <div className="max-w-[580px]">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[color:var(--c-text-1)] tracking-tight m-0">Settings</h1>
        <p className="text-[13px] text-[color:var(--c-text-3)] mt-1 mb-0">Monitoring and startup preferences</p>
      </div>
      <div className="flex flex-col gap-2.5">

        <div className={`${card} px-5 py-4.5`}>
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="text-sm font-medium text-[color:var(--c-text-1)]">Poll Interval</div>
              <div className="text-xs text-[color:var(--c-text-3)] mt-0.5">How often to refresh process data</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input type="number" min="1" max="60" value={settings.poll} onChange={(e) => onUpdate({ poll: Number(e.target.value) || 2 })} className={`${numberFieldClass} w-16`} />
              <span className="text-[13px] text-[color:var(--c-text-3)]">sec</span>
            </div>
          </div>
        </div>

        <div className={`${card} px-5 py-4.5`}>
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="text-sm font-medium text-[color:var(--c-text-1)]">Auto-block Threshold</div>
              <div className="text-xs text-[color:var(--c-text-3)] mt-0.5">Block apps exceeding this daily usage</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input type="number" min="0" max="10000" value={settings.autoThresh} onChange={(e) => onUpdate({ autoThresh: Number(e.target.value) || 100 })} className={`${numberFieldClass} w-[78px]`} />
              <span className="text-[13px] text-[color:var(--c-text-3)]">MB</span>
            </div>
          </div>
        </div>

        <div className={`${card} px-5 py-4.5`}>
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="text-sm font-medium text-[color:var(--c-text-1)]">Start with Windows</div>
              <div className="text-xs text-[color:var(--c-text-3)] mt-0.5">Launch automatically on system startup</div>
            </div>
            <ToggleSwitch on={settings.startWin} onClick={() => onUpdate({ startWin: !settings.startWin })} />
          </div>
        </div>

        <div className={`${card} px-5 py-4.5`}>
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="text-sm font-medium text-[color:var(--c-text-1)]">Start Backend on Launch</div>
              <div className="text-xs text-[color:var(--c-text-3)] mt-0.5">Auto-start the FastAPI service when app opens</div>
            </div>
            <ToggleSwitch on={settings.startBk} onClick={() => onUpdate({ startBk: !settings.startBk })} />
          </div>
        </div>

        {networkStatus?.network_id && (
          <div className={`${card} px-5 py-4.5`}>
            <div className="flex items-center justify-between gap-5">
              <div>
                <div className="text-sm font-medium text-[color:var(--c-text-1)]">Current Network</div>
                <div className="text-xs text-[color:var(--c-text-3)] mt-0.5 font-mono truncate">{networkStatus.name}</div>
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded ${networkStatus.limit_enabled ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                {networkStatus.limit_enabled ? "Limiting On" : "Open"}
              </span>
            </div>
          </div>
        )}

        <KnownNetworks currentNetworkId={networkStatus?.network_id} />

        <div className="flex items-center gap-3 px-1 py-3 mt-1">
          <img src={logoMark} alt="" className="w-8 h-8 flex-shrink-0 opacity-80" />
          <div>
            <div className="text-[13px] font-semibold text-[color:var(--c-text-2)]">SentryGuard</div>
            <div className="text-[11px] text-[color:var(--c-text-3)]">Monitor. Control. Protect your bandwidth.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
