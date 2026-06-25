import { isRuleActiveNow, statusBadgeClass } from "../lib/format";
import { card, sectionLabel, inputStyle, label, btnPrimary, btnGhost, btnDanger } from "../lib/ui";

export default function Rules({ rules, newRule, onNewRuleChange, addRuleOpen, onToggleAddRule, onAddRule, onDeleteRule }) {
  return (
    <div className="max-w-[820px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight m-0">Rules</h1>
          <p className="text-[13px] text-slate-600 mt-1 mb-0">Manual block and bandwidth-limit rules per process</p>
        </div>
        <button type="button" className={btnPrimary} onClick={onToggleAddRule}>+ Add Rule</button>
      </div>

      {addRuleOpen && (
        <div className="glass border-blue-400/20 rounded-2xl p-5 mb-4.5">
          <div className={`${sectionLabel} mb-4`}>New Rule</div>
          <div className="grid grid-cols-[1fr_140px_140px] gap-3 mb-3.5">
            <div>
              <label className={label}>Process Name</label>
              <input type="text" value={newRule.name} onChange={(e) => onNewRuleChange({ ...newRule, name: e.target.value })} placeholder="chrome.exe" className={`${inputStyle} font-mono`} />
            </div>
            <div>
              <label className={label}>Action</label>
              <select value={newRule.type} onChange={(e) => onNewRuleChange({ ...newRule, type: e.target.value })} className={`${inputStyle} cursor-pointer`}>
                <option value="block">Block</option>
                <option value="limit">Limit</option>
              </select>
            </div>
            <div>
              <label className={label}>Limit (MB)</label>
              <input type="number" disabled={newRule.type !== "limit"} value={newRule.limit} onChange={(e) => onNewRuleChange({ ...newRule, limit: e.target.value })} placeholder="100" className={inputStyle} />
            </div>
          </div>
          {newRule.type === "limit" && (
            <div className="grid grid-cols-[140px_140px_1fr] gap-3 mb-3.5">
              <div>
                <label className={label}>Start Time</label>
                <input type="time" value={newRule.startTime} onChange={(e) => onNewRuleChange({ ...newRule, startTime: e.target.value })} className={inputStyle} />
              </div>
              <div>
                <label className={label}>End Time</label>
                <input type="time" value={newRule.endTime} onChange={(e) => onNewRuleChange({ ...newRule, endTime: e.target.value })} className={inputStyle} />
              </div>
              <div>
                <label className={label}>Category</label>
                <input type="text" value={newRule.category} onChange={(e) => onNewRuleChange({ ...newRule, category: e.target.value })} placeholder="e.g. gaming" className={inputStyle} />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} onClick={onAddRule}>Save Rule</button>
            <button type="button" className={btnGhost} onClick={onToggleAddRule}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rules.map((r) => {
          const ruleStatus = r.blocked ? "blocked" : r.limit_mb != null ? (isRuleActiveNow(r) ? "limited" : "scheduled") : "active";
          return (
            <div key={r.process_name} className={`${card} px-5 py-4 flex items-center gap-3.5`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[13px] font-medium text-[#e2e8f0]">{r.process_name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase inline-block ${statusBadgeClass(ruleStatus)}`}>
                    {r.blocked ? "block" : ruleStatus === "scheduled" ? "scheduled limit" : "limit"}
                  </span>
                  {r.category && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-violet-500/10 text-violet-400">{r.category}</span>
                  )}
                </div>
                {r.limit_mb != null && (
                  <span className="text-xs text-slate-700">
                    Throttled at {r.limit_mb} MB / day{r.start_time && r.end_time ? ` · active ${r.start_time}–${r.end_time}` : ""}
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" className={btnDanger} onClick={() => onDeleteRule(r.process_name)}>Delete</button>
              </div>
            </div>
          );
        })}
        {rules.length === 0 && <div className={`${card} p-8 text-center text-slate-500`}>No rules configured.</div>}
      </div>
    </div>
  );
}
