import { useEffect, useState } from "react";
import { modalOverlay, modalPanel, inputStyle, label, btnPrimary, btnGhost } from "../lib/ui";

export default function LimitModal({ isOpen, onClose, appName, currentLimit, onSave }) {
  const [val, setVal] = useState("");
  useEffect(() => { setVal(currentLimit ? String(currentLimit) : ""); }, [currentLimit, isOpen]);
  if (!isOpen) return null;

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={`${modalPanel} w-[340px] p-6`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5">
          <div className="text-base font-bold text-slate-100 mb-1">Set Bandwidth Limit</div>
          <div className="text-[13px] text-slate-500">Throttle network access for <span className="text-slate-400 font-mono">{appName}</span></div>
        </div>
        <div className="mb-5">
          <label className={label}>Limit (MB)</label>
          <input type="number" min="1" value={val} onChange={(e) => setVal(e.target.value)} placeholder="500" className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
        </div>
        <div className="flex gap-2.5">
          <button className={`${btnGhost} flex-1`} onClick={onClose}>Cancel</button>
          <button
            className={`${btnPrimary} flex-1`}
            onClick={() => {
              const num = val.trim() === "" ? null : Number(val);
              onSave(appName, num);
              onClose();
            }}
          >
            Apply Limit
          </button>
        </div>
      </div>
    </div>
  );
}
