import { DialogTitle, Description } from "@headlessui/react";
import Modal from "./Modal";
import { btnPrimary, btnGhost } from "../lib/ui";
import { formatBytes } from "../lib/format";

export default function HighUsagePromptModal({ isOpen, appName, totalMb, thresholdMb, onLimit, onIgnore }) {
  return (
    <Modal isOpen={isOpen} onClose={onIgnore} className="w-[380px] p-6">
      <div className="flex justify-between items-start mb-5">
        <div>
          <DialogTitle className="text-base font-bold text-[color:var(--c-text-1)] mb-1">High Data Usage</DialogTitle>
          <Description className="text-[13px] text-[color:var(--c-text-3)]">
            <span className="text-[color:var(--c-text-2)] font-mono">{appName}</span> has used{" "}
            <span className="text-[color:var(--c-text-2)] font-mono">{formatBytes(totalMb)}</span> of data. Limit it to{" "}
            {thresholdMb} MB/day to save bandwidth?
          </Description>
        </div>
        <button onClick={onIgnore} className="bg-transparent border-none text-[color:var(--c-text-3)] hover:text-[color:var(--c-text-1)] cursor-pointer text-base transition-colors duration-150">✕</button>
      </div>
      <div className="flex gap-2.5">
        <button className={`${btnGhost} flex-1`} onClick={onIgnore}>Ignore</button>
        <button className={`${btnPrimary} flex-1`} onClick={onLimit}>Limit Now</button>
      </div>
    </Modal>
  );
}
