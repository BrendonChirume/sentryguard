import { useEffect, useMemo, useState, useRef } from "react";
import {
  blockProcess,
  unblockProcess,
  setLimit,
  fetchEvents,
  fetchRules,
  subscribeUsage,
  fetchSettings,
  saveSettings,
  fetchConnections,
  fetchHistory,
  saveRule,
  deleteRule,
  unthrottleProcess,
  setNotifyMuted,
  fetchGlobalUsage,
  throttleAll,
  fetchNetworkStatus,
  saveNetworkDecision
} from "./api";
import { appColor, ruleStatus } from "./lib/format";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import LimitModal from "./components/LimitModal";
import ConnectionModal from "./components/ConnectionModal";
import NetworkPromptModal from "./components/NetworkPromptModal";
import HighUsagePromptModal from "./components/HighUsagePromptModal";
import GlobalLimitPromptModal from "./components/GlobalLimitPromptModal";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Rules from "./pages/Rules";
import Events from "./pages/Events";
import Settings from "./pages/Settings";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [apps, setApps] = useState([]);
  const [rules, setRules] = useState([]);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyHours, setHistoryHours] = useState(24);
  const [connected, setConnected] = useState(false);

  const [search, setSearch] = useState("");
  const [appFilter, setAppFilter] = useState("all");
  const [settings, setSettings] = useState({ poll: 2, autoThresh: 500, startWin: false, startBk: true, globalLimitMb: null, globalLimitPeriod: "weekly", autoThrottleKbps: 100 });
  const [globalUsage, setGlobalUsage] = useState(null);
  const [globalLimitPrompt, setGlobalLimitPrompt] = useState(null);

  const [newRule, setNewRule] = useState({ name: "", type: "block", limit: 1000, startTime: "", endTime: "", category: "", throttleKbps: "" });
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [inspectorModal, setInspectorModal] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [networkPromptOpen, setNetworkPromptOpen] = useState(false);
  const [highUsageQueue, setHighUsageQueue] = useState([]);

  const prevUsageRef = useRef({});
  const lastEventTsRef = useRef(null);
  const notifiedNetworkRef = useRef(null);
  const notifiedHighUsageRef = useRef(new Set());
  const notifiedGlobalLimitRef = useRef(null);
  const appsRef = useRef([]);

  useEffect(() => {
    fetchSettings().then(res => {
      setSettings({
        poll: Number(res.poll_interval) || 2,
        autoThresh: Number(res.auto_thresh) || 500,
        startWin: res.start_win === "true",
        startBk: res.start_bk === "true",
        globalLimitMb: res.global_limit_mb ? Number(res.global_limit_mb) : null,
        globalLimitPeriod: res.global_limit_period || "weekly",
        autoThrottleKbps: Number(res.auto_throttle_kbps) || 100,
      });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const handleUsage = (newUsage) => {
      const now = Date.now();
      const updated = newUsage.map(p => {
        const key = `${p.pid}-${p.name}`;
        const prev = prevUsageRef.current[key];
        let speed = 0;
        if (prev) {
          const timeDiff = Math.max(0.5, (now - prev.timestamp) / 1000);
          speed = Math.max(0, ((p.bytes_sent + p.bytes_recv) - (prev.bytes_sent + prev.bytes_recv)) / timeDiff);
        }
        prevUsageRef.current[key] = { bytes_sent: p.bytes_sent, bytes_recv: p.bytes_recv, timestamp: now };
        return { ...p, speed };
      });
      setApps(updated);
    };
    const unsub = subscribeUsage(handleUsage, setConnected);
    return unsub;
  }, []);

  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  useEffect(() => {
    const refresh = () => {
      fetchRules().then(setRules).catch(console.error);
      fetchEvents().then(list => {
        if (lastEventTsRef.current === null) {
          lastEventTsRef.current = list.reduce((max, e) => Math.max(max, e.timestamp), 0);
        } else {
          const newOnes = list.filter(e => e.timestamp > lastEventTsRef.current);
          for (const e of newOnes) {
            if (e.action === "auto_block") {
              const displayName = appsRef.current.find(a => a.name === e.process_name)?.description || e.process_name;
              window.sentryguard?.notify?.("SentryGuard — Auto-blocked", `${displayName}: ${e.detail}`);
            }
          }
          if (newOnes.length) {
            lastEventTsRef.current = Math.max(lastEventTsRef.current, ...newOnes.map(e => e.timestamp));
          }
        }
        setEvents(list);
      }).catch(console.error);
    };
    refresh();
    const inv = setInterval(refresh, 4000);
    return () => clearInterval(inv);
  }, []);

  useEffect(() => {
    const refresh = () => fetchHistory(historyHours).then(setHistory).catch(console.error);
    refresh();
    const inv = setInterval(refresh, 60000);
    return () => clearInterval(inv);
  }, [historyHours]);

  useEffect(() => {
    const refresh = () => {
      fetchNetworkStatus().then(status => {
        setNetworkStatus(status);
        if (status.needs_prompt && status.network_id && notifiedNetworkRef.current !== status.network_id) {
          notifiedNetworkRef.current = status.network_id;
          window.sentryguard?.notify?.("SentryGuard — New network detected", `Limit data usage on "${status.name}"?`);
          setNetworkPromptOpen(true);
        }
      }).catch(console.error);
    };
    refresh();
    const inv = setInterval(refresh, 10000);
    return () => clearInterval(inv);
  }, []);

  const rulesMap = useMemo(() => {
    const map = new Map();
    rules.forEach(r => map.set(r.process_name, r));
    return map;
  }, [rules]);

  const appsWithStatus = useMemo(() => {
    return apps.map(app => {
      const rule = rulesMap.get(app.name);
      return {
        ...app,
        status: ruleStatus(rule),
        limitMb: rule?.limit_mb ?? null,
        notifyMuted: rule?.notify_muted ?? false,
      };
    });
  }, [apps, rulesMap]);

  const totalUsedMb = useMemo(() => apps.reduce((s, a) => s + a.total_mb, 0), [apps]);

  useEffect(() => {
    const warnThreshMb = settings.autoThresh * 0.8;
    const candidates = appsWithStatus.filter(
      (a) => a.status === "active" && !a.notifyMuted && a.total_mb >= warnThreshMb && !notifiedHighUsageRef.current.has(a.name)
    );
    if (candidates.length === 0) return;
    for (const app of candidates) {
      notifiedHighUsageRef.current.add(app.name);
      window.sentryguard?.notifyHighUsage?.(app.name, app.total_mb, app.description);
    }
  }, [appsWithStatus, settings.autoThresh]);

  useEffect(() => {
    const unsub = window.sentryguard?.onHighUsageIgnored?.(({ appName, totalMb, displayName }) => {
      setHighUsageQueue((q) => [...q, { name: appName, totalMb, displayName }]);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const refresh = () => fetchGlobalUsage(settings.globalLimitPeriod).then(setGlobalUsage).catch(console.error);
    refresh();
    const inv = setInterval(refresh, 60000);
    return () => clearInterval(inv);
  }, [settings.globalLimitPeriod]);

  useEffect(() => {
    if (!globalUsage || !settings.globalLimitMb) return;
    if (totalUsedMb < settings.globalLimitMb) return;
    if (notifiedGlobalLimitRef.current === globalUsage.period_start) return;
    notifiedGlobalLimitRef.current = globalUsage.period_start;
    window.sentryguard?.notifyGlobalLimit?.(totalUsedMb, settings.globalLimitMb, settings.globalLimitPeriod);
  }, [totalUsedMb, globalUsage, settings.globalLimitMb, settings.globalLimitPeriod]);

  useEffect(() => {
    const unsub = window.sentryguard?.onGlobalLimitIgnored?.(({ totalMb, limitMb, period }) => {
      setGlobalLimitPrompt({ totalMb, limitMb, period });
    });
    return unsub;
  }, []);

  const totalRate = useMemo(() => apps.reduce((s, a) => s + (a.speed || 0), 0), [apps]);
  const blkCnt = useMemo(() => appsWithStatus.filter(a => a.status === "blocked").length, [appsWithStatus]);
  const limCnt = useMemo(() => appsWithStatus.filter(a => a.status === "limited" || a.status === "throttled").length, [appsWithStatus]);

  const top5 = useMemo(() => {
    const sorted = [...apps].sort((a, b) => b.total_mb - a.total_mb).slice(0, 5);
    const total = sorted.reduce((s, a) => s + a.total_mb, 0) || 1;
    return sorted.map(a => ({ ...a, percent: (a.total_mb / total) * 100, color: appColor(a.name) }));
  }, [apps]);

  const filteredApps = useMemo(() => {
    let f = appsWithStatus;
    if (appFilter === "high") f = f.filter(a => a.total_mb > 200);
    else if (appFilter === "blocked") f = f.filter(a => a.status === "blocked");
    else if (appFilter === "limited") f = f.filter(a => a.status === "limited");
    if (search) f = f.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    return f;
  }, [appsWithStatus, appFilter, search]);

  const handleAction = (app, action) => {
    if (action === "block") {
      blockProcess(app.name).then(() => fetchRules().then(setRules));
    } else if (action === "unblock") {
      unblockProcess(app.name).then(() => fetchRules().then(setRules));
    } else if (action === "unthrottle") {
      unthrottleProcess(app.name).then(() => fetchRules().then(setRules));
    } else if (action === "limit") {
      const rule = rulesMap.get(app.name);
      setModal({ appName: app.name, limit: rule?.limit_mb ?? null, throttleKbps: rule?.throttle_kbps ?? null });
    } else if (action === "inspect") {
      fetchConnections(app.name).then(res => setInspectorModal({ appName: app.name, connections: res })).catch(console.error);
    } else if (action === "mute" || action === "unmute") {
      setNotifyMuted(app.name, action === "mute").then(() => fetchRules().then(setRules));
    }
  };

  const handleSaveLimit = (name, { limitMb, throttleKbps }) => {
    const rule = rulesMap.get(name);
    saveRule({
      process_name: name,
      limit_mb: limitMb,
      start_time: rule?.start_time ?? null,
      end_time: rule?.end_time ?? null,
      category: rule?.category ?? null,
      throttle_kbps: throttleKbps,
    }).then(() => fetchRules().then(setRules));
  };

  const handleSaveSettings = (next) => {
    saveSettings({
      poll_interval: String(next.poll),
      auto_thresh: String(next.autoThresh),
      start_win: String(next.startWin),
      start_bk: String(next.startBk),
      global_limit_mb: next.globalLimitMb ? String(next.globalLimitMb) : "",
      global_limit_period: next.globalLimitPeriod,
      auto_throttle_kbps: String(next.autoThrottleKbps),
    }).catch(console.error);
  };

  const updateSettings = (patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      handleSaveSettings(next);
      return next;
    });
  };

  const addRule = () => {
    if (!newRule.name.trim()) return;
    const finish = () => {
      setNewRule({ name: "", type: "block", limit: 1000, startTime: "", endTime: "", category: "", throttleKbps: "" });
      setAddRuleOpen(false);
      fetchRules().then(setRules);
    };
    if (newRule.type === "block") {
      blockProcess(newRule.name).then(finish);
    } else {
      saveRule({
        process_name: newRule.name,
        limit_mb: Number(newRule.limit),
        start_time: newRule.startTime || null,
        end_time: newRule.endTime || null,
        category: newRule.category || null,
        throttle_kbps: newRule.throttleKbps ? Number(newRule.throttleKbps) : null,
      }).then(finish);
    }
  };

  const handleDeleteRule = (name) => {
    deleteRule(name).then(() => fetchRules().then(setRules)).catch(console.error);
  };

  const handleNetworkDecision = (limitEnabled) => {
    if (!networkStatus?.network_id) return;
    saveNetworkDecision({ network_id: networkStatus.network_id, name: networkStatus.name, limit_enabled: limitEnabled })
      .then(() => fetchNetworkStatus().then(setNetworkStatus))
      .catch(console.error);
    setNetworkPromptOpen(false);
  };

  const handleLimitHighUsageApp = () => {
    const current = highUsageQueue[0];
    if (!current) return;
    setLimit(current.name, settings.autoThresh).then(() => fetchRules().then(setRules)).catch(console.error);
    setHighUsageQueue((q) => q.slice(1));
  };

  const dismissHighUsagePrompt = () => {
    setHighUsageQueue((q) => q.slice(1));
  };

  const handleThrottleAll = (kbps) => {
    throttleAll(kbps).then(() => fetchRules().then(setRules)).catch(console.error);
    setGlobalLimitPrompt(null);
  };

  const dismissGlobalLimitPrompt = () => {
    setGlobalLimitPrompt(null);
  };

  return (
    <div className="flex flex-col w-screen h-screen text-[color:var(--c-text-1)] font-sans leading-relaxed overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar page={page} onNavigate={setPage} connected={connected} />

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {!connected && (
            <div className="glass border-x-0 border-t-0 px-6 py-1.5 flex items-center gap-2 flex-shrink-0 bg-amber-500/[0.04]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <span className="text-xs font-semibold text-amber-500">Backend unreachable</span>
              <span className="text-xs text-[color:var(--c-text-3)]">Could not connect to local SentryGuard service — usage data is unavailable</span>
            </div>
          )}

          <div className="flex-1 overflow-auto p-7">
            {page === "dashboard" && (
              <Dashboard
                apps={appsWithStatus}
                top5={top5}
                totalUsedMb={totalUsedMb}
                totalRate={totalRate}
                blkCnt={blkCnt}
                limCnt={limCnt}
                history={history}
                historyHours={historyHours}
                onHistoryHoursChange={setHistoryHours}
                globalUsage={globalUsage}
                globalLimitMb={settings.globalLimitMb}
                globalLimitPeriod={settings.globalLimitPeriod}
                onUpdateSettings={updateSettings}
                pollSeconds={settings.poll}
                onAction={handleAction}
              />
            )}
            {page === "apps" && (
              <Applications
                apps={filteredApps}
                search={search}
                onSearchChange={setSearch}
                appFilter={appFilter}
                onFilterChange={setAppFilter}
                onAction={handleAction}
              />
            )}
            {page === "rules" && (
              <Rules
                rules={rules}
                apps={appsWithStatus}
                newRule={newRule}
                onNewRuleChange={setNewRule}
                addRuleOpen={addRuleOpen}
                onToggleAddRule={() => setAddRuleOpen(v => !v)}
                onAddRule={addRule}
                onDeleteRule={handleDeleteRule}
              />
            )}
            {page === "events" && <Events events={events} />}
            {page === "settings" && <Settings settings={settings} onUpdate={updateSettings} networkStatus={networkStatus} />}
          </div>
        </div>
      </div>

      <LimitModal isOpen={modal !== null} appName={modal?.appName} currentLimit={modal?.limit} currentThrottle={modal?.throttleKbps} onClose={() => setModal(null)} onSave={handleSaveLimit} />
      <ConnectionModal isOpen={inspectorModal !== null} appName={inspectorModal?.appName} connections={inspectorModal?.connections} onClose={() => setInspectorModal(null)} />
      <NetworkPromptModal
        isOpen={networkPromptOpen}
        networkName={networkStatus?.name}
        onDecide={handleNetworkDecision}
        onDismiss={() => setNetworkPromptOpen(false)}
      />
      <HighUsagePromptModal
        isOpen={highUsageQueue.length > 0}
        appName={highUsageQueue[0]?.displayName || highUsageQueue[0]?.name}
        totalMb={highUsageQueue[0]?.totalMb}
        thresholdMb={settings.autoThresh}
        onLimit={handleLimitHighUsageApp}
        onIgnore={dismissHighUsagePrompt}
      />
      <GlobalLimitPromptModal
        isOpen={globalLimitPrompt !== null}
        totalMb={globalLimitPrompt?.totalMb}
        limitMb={globalLimitPrompt?.limitMb}
        period={globalLimitPrompt?.period}
        onThrottle={handleThrottleAll}
        onIgnore={dismissGlobalLimitPrompt}
      />
    </div>
  );
}

