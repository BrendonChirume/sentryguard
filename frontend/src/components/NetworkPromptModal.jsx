import { modalOverlay, modalPanel, btnPrimary, btnGhost } from "../lib/ui";

export default function NetworkPromptModal({ isOpen, networkName, onDecide, onDismiss }) {
  if (!isOpen) return null;
  return (
    <div className={modalOverlay}>
      <div className={`${modalPanel} w-[380px] p-6`}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <div className="text-base font-bold text-[color:var(--c-text-1)] mb-1">New Network Detected</div>
            <div className="text-[13px] text-[color:var(--c-text-3)]">
              SentryGuard connected to <span className="text-[color:var(--c-text-2)] font-mono">{networkName}</span>. Apply the standard
              data-usage threshold on this network?
            </div>
          </div>
          <button onClick={onDismiss} className="bg-transparent border-none text-[color:var(--c-text-3)] hover:text-[color:var(--c-text-1)] cursor-pointer text-base transition-colors duration-150">✕</button>
        </div>
        <div className="flex gap-2.5">
          <button className={`${btnGhost} flex-1`} onClick={() => onDecide(false)}>Keep Open</button>
          <button className={`${btnPrimary} flex-1`} onClick={() => onDecide(true)}>Limit Data</button>
        </div>
        <div className="text-[11px] text-[color:var(--c-text-3)] mt-3">This choice is remembered for this network, so you won't be asked again.</div>
      </div>
    </div>
  );
}
