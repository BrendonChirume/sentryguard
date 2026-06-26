import { useState } from "react";
import { DialogTitle, Description } from "@headlessui/react";
import Modal from "./Modal";
import { inputStyle, label, btnPrimary, btnGhost } from "../lib/ui";
import { formatBytes } from "../lib/format";

export default function GlobalLimitPromptModal({ isOpen, totalMb, limitMb, period, onThrottle, onIgnore }) {
  const [kbps, setKbps] = useState("200");

  return (
    <Modal isOpen={isOpen} onClose={onIgnore} className="w-[380px] p-6">
      <div className="mb-5">
        <DialogTitle className="text-base font-bold text-[color:var(--c-text-1)] mb-1">Data Limit Reached</DialogTitle>
        <Description className="text-[13px] text-[color:var(--c-text-3)]">
          Combined usage is <span className="text-[color:var(--c-text-2)] font-mono">{formatBytes(totalMb)}</span>, over your{" "}
          {period} limit of <span className="text-[color:var(--c-text-2)] font-mono">{formatBytes(limitMb)}</span>. Throttle every
          tracked app to slow things down?
        </Description>
      </div>
      <div className="mb-5">
        <label className={label}>Throttle Speed (KB/s)</label>
        <input type="number" min="1" value={kbps} onChange={(e) => setKbps(e.target.value)} className={`${inputStyle} text-base font-medium px-3 py-2.5`} />
      </div>
      <div className="flex gap-2.5">
        <button className={`${btnGhost} flex-1`} onClick={onIgnore}>Not Now</button>
        <button className={`${btnPrimary} flex-1`} onClick={() => onThrottle(Number(kbps))}>Throttle All</button>
      </div>
    </Modal>
  );
}
