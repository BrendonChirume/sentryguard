import { useEffect, useState } from "react";
import { fetchKnownNetworks, forgetNetwork, saveNetworkDecision } from "../api";
import { card, btnGhost } from "../lib/ui";
import ToggleSwitch from "./ToggleSwitch";

export default function KnownNetworks({ currentNetworkId }) {
  const [networks, setNetworks] = useState([]);

  const refresh = () => fetchKnownNetworks().then(setNetworks).catch(console.error);
  useEffect(() => { refresh(); }, []);

  const toggle = (net) => {
    saveNetworkDecision({ network_id: net.network_id, name: net.name, limit_enabled: !net.limit_enabled }).then(refresh);
  };

  const forget = (net) => {
    forgetNetwork(net.network_id).then(refresh);
  };

  return (
    <div className={`${card} px-5 py-4.5`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-[color:var(--c-text-1)]">Known Networks</div>
      </div>
      <div className="text-xs text-[color:var(--c-text-3)] mb-3">Remembered monitoring choices, so you're not asked again on the same network</div>

      {networks.length === 0 && <div className="text-xs text-[color:var(--c-text-3)] py-2">No networks remembered yet.</div>}

      <div className="flex flex-col gap-2">
        {networks.map((net) => (
          <div key={net.network_id} className="flex items-center justify-between gap-3 bg-[var(--c-surface-1)] border border-[var(--c-border-10)] rounded-lg px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[13px] text-[color:var(--c-text-1)] font-mono truncate">{net.name}</div>
              {net.network_id === currentNetworkId && <div className="text-[11px] text-emerald-400 mt-0.5">Currently connected</div>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <ToggleSwitch on={net.limit_enabled} onClick={() => toggle(net)} />
              <button type="button" className={`${btnGhost} px-2.5 py-1 text-xs`} onClick={() => forget(net)}>Forget</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
