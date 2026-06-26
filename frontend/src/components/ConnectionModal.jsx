import { DialogTitle } from "@headlessui/react";
import Modal from "./Modal";
import { th, td } from "../lib/ui";

export default function ConnectionModal({ isOpen, onClose, appName, connections }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-[600px] max-h-[80vh] p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <DialogTitle className="m-0 text-base font-bold text-[color:var(--c-text-1)]">Network Connections</DialogTitle>
        <button onClick={onClose} className="bg-transparent border-none text-[color:var(--c-text-3)] hover:text-[color:var(--c-text-1)] cursor-pointer text-base transition-colors duration-150">✕</button>
      </div>
      <p className="text-[color:var(--c-text-3)] text-[13px] mb-4">
        Active TCP/UDP connections for <span className="text-[color:var(--c-text-2)] font-mono">{appName}</span>
      </p>
      <div className="flex-1 overflow-auto bg-[var(--c-inset-bg)] rounded-xl border border-[var(--c-border-10)]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[var(--c-border-10)] bg-[var(--c-surface-1)] backdrop-blur-md">
              <th className={th}>Type</th>
              <th className={th}>Local Addr</th>
              <th className={th}>Remote Addr</th>
              <th className={th}>Host</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {connections && connections.map((c, i) => (
              <tr key={i} className="border-b border-[var(--c-row-border)]">
                <td className={`${td} font-mono text-xs text-blue-500`}>{c.type}</td>
                <td className={`${td} font-mono text-xs text-[color:var(--c-text-1)]`}>{c.laddr || "*"}</td>
                <td className={`${td} font-mono text-xs text-[color:var(--c-text-1)]`}>{c.raddr || "*"}</td>
                <td className={`${td} font-mono text-xs text-[color:var(--c-text-2)]`}>{c.hostname || "—"}</td>
                <td className={`${td} font-mono text-xs text-emerald-500`}>{c.status}</td>
              </tr>
            ))}
            {(!connections || connections.length === 0) && (
              <tr><td colSpan="5" className="p-6 text-center text-[color:var(--c-text-3)] text-[13px]">No active connections found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
