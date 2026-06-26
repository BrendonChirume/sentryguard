import { useEffect, useState } from "react";
import { DialogTitle, Description } from "@headlessui/react";
import Modal from "./Modal";
import { inputStyle, label, btnPrimary, btnGhost } from "../lib/ui";

export default function LimitModal({ isOpen, onClose, appName, currentLimit, currentThrottle, onSave }) {
  const [val, setVal] = useState("");
  const [throttleVal, setThrottleVal] = useState("");
  useEffect(() => {
    setVal(currentLimit ? String(currentLimit) : "");
    setThrottleVal(currentThrottle ? String(currentThrottle) : "");
  }, [currentLimit, currentThrottle, isOpen]);

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
      <div className="flex gap-2.5">
        <button className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button>
        <button
          className={`${btnPrimary} flex-1`}
          onClick={() => {
            const limitMb = val.trim() === "" ? null : Number(val);
            const throttleKbps = throttleVal.trim() === "" ? null : Number(throttleVal);
            onSave(appName, { limitMb, throttleKbps });
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </Modal>
  );
}
