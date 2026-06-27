import { useMemo, useState } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { ruleStatus, statusBadgeClass } from "../lib/format";
import { card, sectionLabel, inputStyle, label, btnPrimary, btnGhost, btnDanger } from "../lib/ui";

function ProcessNameField({ value, apps, onChange }) {
  const [query, setQuery] = useState("");

  const descriptionByName = useMemo(() => {
    const map = new Map();
    for (const a of apps) if (a.description) map.set(a.name, a.description);
    return map;
  }, [apps]);

  const processNames = useMemo(() => {
    const names = [...new Set(apps.map((a) => a.name))].sort((a, b) => a.localeCompare(b));
    if (!query) return names;
    return names.filter((n) => n.toLowerCase().includes(query.toLowerCase()) || descriptionByName.get(n)?.toLowerCase().includes(query.toLowerCase()));
  }, [apps, query, descriptionByName]);

  return (
    <Combobox value={value} onChange={(v) => v != null && onChange(v)} onClose={() => setQuery("")}>
      <div className="relative">
        <ComboboxInput
          className={`${inputStyle} font-mono`}
          displayValue={(v) => v ?? ""}
          placeholder="chrome.exe"
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2.5 text-[color:var(--c-text-3)]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </ComboboxButton>
        <ComboboxOptions
          anchor="bottom start"
          className="w-[var(--input-width)] mt-1.5 max-h-60 overflow-auto rounded-xl glass-strong shadow-md p-1 z-50 empty:invisible"
        >
          {processNames.map((name) => (
            <ComboboxOption
              key={name}
              value={name}
              className="px-3 py-2 rounded-lg text-[13px] text-[color:var(--c-text-1)] cursor-pointer data-focus:bg-[var(--c-surface-3)] data-selected:text-blue-400"
            >
              {descriptionByName.has(name) ? (
                <span className="flex flex-col leading-tight">
                  <span>{descriptionByName.get(name)}</span>
                  <span className="text-[11px] font-mono text-[color:var(--c-text-4)]">{name}</span>
                </span>
              ) : (
                <span className="font-mono">{name}</span>
              )}
            </ComboboxOption>
          ))}
          {processNames.length === 0 && (
            <div className="px-3 py-2 text-[13px] text-[color:var(--c-text-3)]">No running processes match "{query}"</div>
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}

const ACTION_OPTIONS = [
  { value: "block", label: "Block" },
  { value: "limit", label: "Limit" },
];

function ActionField({ value, onChange }) {
  const current = ACTION_OPTIONS.find((o) => o.value === value) ?? ACTION_OPTIONS[0];
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton className={`${inputStyle} cursor-pointer flex items-center justify-between text-left`}>
          {current.label}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className="w-[var(--button-width)] mt-1.5 rounded-xl glass-strong shadow-md p-1 z-50">
          {ACTION_OPTIONS.map((o) => (
            <ListboxOption
              key={o.value}
              value={o.value}
              className="px-3 py-2 rounded-lg text-[13px] text-[color:var(--c-text-1)] cursor-pointer data-focus:bg-[var(--c-surface-3)] data-selected:text-blue-400"
            >
              {o.label}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

export default function Rules({ rules, apps, newRule, onNewRuleChange, addRuleOpen, onToggleAddRule, onAddRule, onDeleteRule }) {
  const descriptionByName = useMemo(() => {
    const map = new Map();
    for (const a of apps) if (a.description) map.set(a.name, a.description);
    return map;
  }, [apps]);

  return (
    <div className="max-w-[820px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--c-text-1)] tracking-tight m-0">Rules</h1>
          <p className="text-[13px] text-[color:var(--c-text-3)] mt-1 mb-0">Manual block and bandwidth-limit rules per process</p>
        </div>
        <button type="button" className={btnPrimary} onClick={onToggleAddRule}>+ Add Rule</button>
      </div>

      {addRuleOpen && (
        <div className="glass border-blue-400/20 rounded-2xl p-5 mb-4.5">
          <div className={`${sectionLabel} mb-4`}>New Rule</div>
          <div className="grid grid-cols-[1fr_140px_140px] gap-3 mb-3.5">
            <div>
              <label className={label}>Process Name</label>
              <ProcessNameField value={newRule.name} apps={apps} onChange={(name) => onNewRuleChange({ ...newRule, name })} />
            </div>
            <div>
              <label className={label}>Action</label>
              <ActionField value={newRule.type} onChange={(type) => onNewRuleChange({ ...newRule, type })} />
            </div>
            <div>
              <label className={label}>Data Limit (MB)</label>
              <input type="number" disabled={newRule.type !== "limit"} value={newRule.limit} onChange={(e) => onNewRuleChange({ ...newRule, limit: e.target.value })} placeholder="100" className={inputStyle} />
            </div>
          </div>
          {newRule.type === "limit" && (
            <>
              <div className="grid grid-cols-[140px_1fr] gap-3 mb-3.5">
                <div>
                  <label className={label}>Throttle Speed (KB/s)</label>
                  <input type="number" value={newRule.throttleKbps} onChange={(e) => onNewRuleChange({ ...newRule, throttleKbps: e.target.value })} placeholder="optional" className={inputStyle} />
                </div>
                <div className="flex items-end pb-2.5 text-[11px] text-[color:var(--c-text-3)]">
                  Once the data limit is hit, speed is capped instead of blocking outright. Leave blank to block.
                </div>
              </div>
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
            </>
          )}
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} onClick={onAddRule}>Save Rule</button>
            <button type="button" className={btnGhost} onClick={onToggleAddRule}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rules.map((r) => {
          const status = ruleStatus(r);
          return (
            <div key={r.process_name} className={`${card} px-5 py-4 flex items-center gap-3.5`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {descriptionByName.has(r.process_name) ? (
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-medium text-[color:var(--c-text-1)]">{descriptionByName.get(r.process_name)}</span>
                      <span className="font-mono text-[11px] text-[color:var(--c-text-4)]">{r.process_name}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[13px] font-medium text-[color:var(--c-text-1)]">{r.process_name}</span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase inline-block ${statusBadgeClass(status)}`}>
                    {r.blocked ? "block" : status === "throttled" ? "throttled" : status === "scheduled" ? "scheduled limit" : "limit"}
                  </span>
                  {r.category && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-violet-500/10 text-violet-400">{r.category}</span>
                  )}
                </div>
                {r.limit_mb != null && (
                  <span className="text-xs text-[color:var(--c-text-4)]">
                    {r.throttle_kbps != null ? `Throttles to ${r.throttle_kbps} KB/s` : "Blocks"} at {r.limit_mb} MB / day
                    {r.start_time && r.end_time ? ` · active ${r.start_time}–${r.end_time}` : ""}
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" className={btnDanger} onClick={() => onDeleteRule(r.process_name)}>Delete</button>
              </div>
            </div>
          );
        })}
        {rules.length === 0 && <div className={`${card} p-8 text-center text-[color:var(--c-text-3)]`}>No rules configured.</div>}
      </div>
    </div>
  );
}
