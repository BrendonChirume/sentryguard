import { useEffect, useState } from "react";
import { modalOverlay, modalPanel, inputStyle, label, btnPrimary, btnGhost } from "../lib/ui";

export default function LimitModal({ isOpen, onClose, appName, currentLimit, currentThrottle, onSave }) {
  const [val, setVal] = useState("");
  const [throttleVal, setThrottleVal] = useState("");
  useEffect(() => {
    setVal(currentLimit ? String(currentLimit) : "");
    setThrottleVal(currentThrottle ? String(currentThrottle) : "");
  }, [currentLimit, currentThrottle, isOpen]);
  if (!isOpen) return null;

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={`${modalPanel} w-[360px] p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5">
          <div className="text-base font-bold text-slate-100 mb-1">Set Data Limit</div>
          <div className="text-[13px] text-slate-500">Cap network usage for <span className="text-slate-400 font-mono">{appName}</span></div>
        </div>
        <div className="mb-4">
          <label className={label}>Data Limit (MB)</label>
          <input type="number" min="1" value={val} onChange={(e) => setVal(e.target.value)} placeholder="500" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
        </div>
        <div className="mb-5">
          <label className={label}>Throttle Speed (KB/s) — optional</label>
          <input type="number" min="1" value={throttleVal} onChange={(e) => setThrottleVal(e.target.value)} placeholder="e.g. 100" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
          <div className="text-[11px] text-slate-600 mt-1.5">
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
      </div>
    </div>
  );
}
