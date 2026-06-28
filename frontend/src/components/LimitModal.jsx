import { useEffect, useState } from "react";
import { DialogTitle, Description } from "@headlessui/react";
import Modal from "./Modal";
import { inputStyle, label, btnPrimary, btnGhost } from "../lib/ui";

export default function LimitModal({ isOpen, onClose, appName, currentLimit, currentThrottle, currentTarget, currentSsids, currentNetwork, onSave }) {
  const [val, setVal] = useState("");
  const [throttleVal, setThrottleVal] = useState("");
  const [targetVal, setTargetVal] = useState("");
  const [scopedToNetwork, setScopedToNetwork] = useState(false);
  useEffect(() => {
    setVal(currentLimit ? String(currentLimit) : "");
    setThrottleVal(currentThrottle ? String(currentThrottle) : "");
    setTargetVal(currentTarget ? String(currentTarget) : "");
    setScopedToNetwork(!!(currentSsids && currentSsids.length));
  }, [currentLimit, currentThrottle, currentTarget, currentSsids, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[360px] p-6">
      <div className="mb-5">
        <DialogTitle className="text-base font-bold text-[color:var(--c-text-1)] mb-1">Set Data Limit</DialogTitle>
        <Description className="text-[13px] text-[color:var(--c-text-3)]">Cap network usage for <span className="text-[color:var(--c-text-2)] font-mono">{appName}</span></Description>
      </div>
      <div className="mb-4">
        <label className={label}>Data Limit (MB)</label>
        <input type="number" min="1" value={val} onChange={(e) => setVal(e.target.value)} placeholder="500" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
      </div>
      <div className="mb-5">
        <label className={label}>Throttle Speed (KB/s) — optional</label>
        <input type="number" min="1" value={throttleVal} onChange={(e) => setThrottleVal(e.target.value)} placeholder="e.g. 100" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
        <div className="text-[11px] text-[color:var(--c-text-3)] mt-1.5">
          Once the limit is reached, the app's speed is capped instead of fully blocking it. Leave blank to block outright.
        </div>
      </div>
      <div className="mb-5">
        <label className={label}>Daily Target (MB) — optional</label>
        <input type="number" min="1" value={targetVal} onChange={(e) => setTargetVal(e.target.value)} placeholder="e.g. 1000" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
        <div className="text-[11px] text-[color:var(--c-text-3)] mt-1.5">
          Auto-paces the app's throttle speed every minute so it lands at this much usage by midnight, instead of a fixed cutoff.
        </div>
      </div>
      <div className="mb-5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={scopedToNetwork}
            disabled={!currentNetwork?.id}
            onChange={(e) => setScopedToNetwork(e.target.checked)}
            className="accent-blue-500"
          />
          <span className="text-[11px] font-semibold text-[color:var(--c-text-2)] uppercase tracking-wide">
            Only on current network{currentNetwork?.name ? ` (${currentNetwork.name})` : ""}
          </span>
        </label>
        <div className="text-[11px] text-[color:var(--c-text-3)] mt-1.5">
          {currentNetwork?.id
            ? "This rule will only apply while connected to this network. Leave unchecked to apply everywhere."
            : "No network detected — rule will apply everywhere."}
        </div>
      </div>
      <div className="flex gap-2.5">
        <button className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button>
        <button
          className={`${btnPrimary} flex-1`}
          onClick={() => {
            const limitMb = val.trim() === "" ? null : Number(val);
            const throttleKbps = throttleVal.trim() === "" ? null : Number(throttleVal);
            const targetMb = targetVal.trim() === "" ? null : Number(targetVal);
            const ssids = scopedToNetwork && currentNetwork?.id ? [currentNetwork.id] : [];
            onSave(appName, { limitMb, throttleKbps, targetMb, ssids });
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </Modal>
  );
}
