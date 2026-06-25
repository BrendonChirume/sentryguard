import { modalOverlay, modalPanel, th, td } from "../lib/ui";

export default function ConnectionModal({ isOpen, onClose, appName, connections }) {
  if (!isOpen) return null;
  return (
    <div className={modalOverlay} onClick={onClose}>
      <div
        className={`${modalPanel} w-[600px] max-h-[80vh] p-6 flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="m-0 text-base font-bold text-slate-100">Network Connections</h3>
          <button onClick={onClose} className="bg-transparent border-none text-slate-500 hover:text-slate-200 cursor-pointer text-base transition-colors duration-150">✕</button>
        </div>
        <p className="text-slate-500 text-[13px] mb-4">
          Active TCP/UDP connections for <span className="text-slate-400 font-mono">{appName}</span>
        </p>
        <div className="flex-1 overflow-auto bg-black/20 rounded-xl border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Type</th>
                <th className={th}>Local Addr</th>
                <th className={th}>Remote Addr</th>
                <th className={th}>Host</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {connections && connections.map((c, i) => (
                <tr key={i} className="border-b border-white/[0.06]">
                  <td className={`${td} font-mono text-xs text-blue-500`}>{c.type}</td>
                  <td className={`${td} font-mono text-xs text-[#e2e8f0]`}>{c.laddr || "*"}</td>
                  <td className={`${td} font-mono text-xs text-[#e2e8f0]`}>{c.raddr || "*"}</td>
                  <td className={`${td} font-mono text-xs text-slate-400`}>{c.hostname || "—"}</td>
                  <td className={`${td} font-mono text-xs text-emerald-500`}>{c.status}</td>
                </tr>
              ))}
              {(!connections || connections.length === 0) && (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500 text-[13px]">No active connections found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
