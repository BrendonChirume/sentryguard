import { modalOverlay, modalPanel, btnPrimary, btnGhost } from "../lib/ui";
import { formatBytes } from "../lib/format";

export default function HighUsagePromptModal({ isOpen, appName, totalMb, thresholdMb, onLimit, onIgnore }) {
  if (!isOpen) return null;
  return (
    <div className={modalOverlay}>
      <div className={`${modalPanel} w-[380px] p-6`}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-base font-bold text-slate-100 mb-1">High Data Usage</div>
            <div className="text-[13px] text-slate-500">
              <span className="text-slate-300 font-mono">{appName}</span> has used{" "}
              <span className="text-slate-300 font-mono">{formatBytes(totalMb)}</span> of data. Limit it to{" "}
              {thresholdMb} MB/day to save bandwidth?
            </div>
          </div>
          <button onClick={onIgnore} className="bg-transparent border-none text-slate-500 hover:text-slate-200 cursor-pointer text-base transition-colors duration-150">✕</button>
        </div>
        <div className="flex gap-2.5">
          <button className={`${btnGhost} flex-1`} onClick={onIgnore}>Ignore</button>
          <button className={`${btnPrimary} flex-1`} onClick={onLimit}>Limit Now</button>
        </div>
      </div>
    </div>
  );
}
