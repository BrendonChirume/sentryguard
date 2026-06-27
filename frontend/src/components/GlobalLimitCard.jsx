import { useEffect, useRef, useState } from "react";
import { DialogTitle } from "@headlessui/react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import Modal from "./Modal";
import { card, sectionLabel, inputStyle, label, btnPrimary, btnGhost, smBtnClass } from "../lib/ui";
import { formatBytes, estimateTimeLeft } from "../lib/format";

const PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const PERIOD_NOUN = { daily: "Day", weekly: "Week", monthly: "Month" };

/** Smooths a noisy live rate and only updates on a fixed, slow timer —
 * decoupled from the ~2s poll cadence — so the "time left" estimate changes
 * at most once every `intervalMs`, instead of jittering with every poll. */
function useSmoothedRate(rate, { intervalMs = 10000, alpha = 0.2 } = {}) {
  const latestRef = useRef(rate || 0);
  const smoothedRef = useRef(rate || 0);
  const [smoothed, setSmoothed] = useState(smoothedRef.current);

  useEffect(() => {
    latestRef.current = rate || 0;
  }, [rate]);

  useEffect(() => {
    const id = setInterval(() => {
      smoothedRef.current += alpha * (latestRef.current - smoothedRef.current);
      setSmoothed(smoothedRef.current);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, alpha]);

  return smoothed;
}

function periodEnd(periodStart, period) {
  const start = new Date(periodStart * 1000);
  if (period === "monthly") return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  if (period === "daily") return new Date(start.getTime() + 86400 * 1000);
  return new Date(start.getTime() + 7 * 86400 * 1000);
}

function EditLimitModal({ isOpen, onClose, initialMb, initialPeriod, onSave }) {
  const [mb, setMb] = useState(initialMb ? String(initialMb) : "");
  const [period, setPeriod] = useState(initialPeriod || "weekly");
  const currentPeriod = PERIOD_OPTIONS.find((o) => o.value === period) ?? PERIOD_OPTIONS[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[360px] p-6">
      <DialogTitle className="text-base font-bold text-[color:var(--c-text-1)] mb-4">Set Global Data Limit</DialogTitle>
      <div className="mb-4">
        <label className={label}>Data Limit (MB)</label>
        <input type="number" min="1" value={mb} onChange={(e) => setMb(e.target.value)} placeholder="e.g. 50000" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
      </div>
      <div className="mb-5">
        <label className={label}>Resets</label>
        <Listbox value={period} onChange={setPeriod}>
          <div className="relative">
            <ListboxButton className={`${inputStyle} cursor-pointer flex items-center justify-between text-left`}>
              {currentPeriod.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </ListboxButton>
            <ListboxOptions anchor="bottom start" className="w-[var(--button-width)] mt-1.5 rounded-xl glass-strong shadow-md p-1 z-50">
              {PERIOD_OPTIONS.map((o) => (
                <ListboxOption key={o.value} value={o.value} className="px-3 py-2 rounded-lg text-[13px] text-[color:var(--c-text-1)] cursor-pointer data-focus:bg-[var(--c-surface-3)] data-selected:text-blue-400">
                  {o.label}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </Listbox>
      </div>
      <div className="flex gap-2.5">
        <button className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button>
        <button
          className={`${btnPrimary} flex-1`}
          onClick={() => {
            const limitMb = mb.trim() === "" ? null : Number(mb);
            onSave(limitMb, period);
            onClose();
          }}
        >
          Save
        </button>
      </div>
    </Modal>
  );
}

export default function GlobalLimitCard({ totalMb, limitMb, period, periodStart, ratePerSec, onUpdate }) {
  const [editOpen, setEditOpen] = useState(false);
  const smoothedRate = useSmoothedRate(ratePerSec);

  const handleSave = (newLimitMb, newPeriod) => onUpdate({ globalLimitMb: newLimitMb, globalLimitPeriod: newPeriod });
  const handleRemove = () => onUpdate({ globalLimitMb: null });

  if (!limitMb) {
    return (
      <div className={`${card} p-4.5 mb-5 flex items-center justify-between gap-4`}>
        <div>
          <div className={sectionLabel}>Global Data Limit</div>
          <div className="text-xs text-[color:var(--c-text-3)] mt-1">Set a combined cap across all apps to get a warning before it's blown through</div>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setEditOpen(true)}>Set Limit</button>
        <EditLimitModal isOpen={editOpen} onClose={() => setEditOpen(false)} initialMb={null} initialPeriod="weekly" onSave={handleSave} />
      </div>
    );
  }

  const percent = Math.min(100, (totalMb / limitMb) * 100);
  const over = totalMb > limitMb;
  const daysLeft = periodStart != null
    ? Math.max(0, Math.ceil((periodEnd(periodStart, period) - Date.now()) / 86400000))
    : null;
  const timeLeft = over ? null : estimateTimeLeft(limitMb - totalMb, smoothedRate);

  return (
    <div className={`${card} p-4.5 mb-5`}>
      <div className="flex items-center justify-between mb-1">
        <div className={sectionLabel}>Data Usage — This {PERIOD_NOUN[period] || "Week"}</div>
        <div className="flex gap-1.5">
          <button type="button" className={smBtnClass("text-blue-500", "border-blue-500/25")} onClick={() => setEditOpen(true)}>Edit Limit</button>
          <button type="button" className={smBtnClass("text-[color:var(--c-text-3)]", "border-[var(--c-border-10)]")} onClick={handleRemove}>Remove</button>
        </div>
      </div>
      <div className="text-xl font-bold text-[color:var(--c-text-1)] mt-2 mb-2.5">{percent.toFixed(0)}% used</div>
      <div className="h-2 rounded-full overflow-hidden bg-[var(--c-inset-bg)] mb-2.5">
        <div
          className={`h-full transition-[width] duration-500 ease-out ${over ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-[color:var(--c-text-3)]">
        <span>
          {formatBytes(totalMb)} used of {formatBytes(limitMb)}
          {over && <span className="text-red-500 font-medium"> · {formatBytes(totalMb - limitMb)} over limit</span>}
        </span>
        {daysLeft != null && <span>{daysLeft} day{daysLeft === 1 ? "" : "s"} until reset</span>}
      </div>
      {timeLeft && (
        <div className="text-xs text-[color:var(--c-text-3)] mt-1.5">
          At this rate: <span className="text-[color:var(--c-text-2)] font-medium">{timeLeft}</span>
        </div>
      )}
      <EditLimitModal isOpen={editOpen} onClose={() => setEditOpen(false)} initialMb={limitMb} initialPeriod={period} onSave={handleSave} />
    </div>
  );
}
