export const ACCENT = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#f97316"];

export function formatBytes(mb) {
  const kb = mb * 1024;
  if (kb >= 1048576) return (kb / 1048576).toFixed(2) + " GB";
  if (kb >= 1024) return (kb / 1024).toFixed(1) + " MB";
  return Math.round(kb) + " KB";
}

export function formatSpeed(bytesPerSec) {
  const kbps = (bytesPerSec || 0) / 1024;
  if (kbps >= 1024) return (kbps / 1024).toFixed(1) + " MB/s";
  return kbps.toFixed(1) + " KB/s";
}

export function appColor(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i);
  return ACCENT[Math.abs(h) % ACCENT.length];
}

export function isRuleActiveNow(rule) {
  if (!rule.start_time || !rule.end_time) return true;
  const now = new Date().toTimeString().slice(0, 5);
  if (rule.start_time <= rule.end_time) return rule.start_time <= now && now <= rule.end_time;
  return now >= rule.start_time || now <= rule.end_time; // window spans midnight
}

export const STATUS_COLOR = { blocked: "#ef4444", throttled: "#06b6d4", limited: "#f59e0b", scheduled: "#8b5cf6", active: "#22c55e" };

export function statusBadgeClass(status) {
  const map = {
    blocked: "bg-red-500/10 text-red-500",
    throttled: "bg-cyan-500/10 text-cyan-400",
    limited: "bg-amber-500/10 text-amber-500",
    scheduled: "bg-violet-500/10 text-violet-500",
    active: "bg-emerald-500/10 text-emerald-500",
  };
  return map[status] || map.active;
}

export function forecastStatus(totalMb, limitMb) {
  if (limitMb == null || limitMb <= 0) return null;
  const now = new Date();
  const secondsToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const fractionElapsed = Math.max(secondsToday / 86400, 0.02); // avoid a wild extrapolation right after midnight
  const projectedMb = totalMb / fractionElapsed;
  return projectedMb > limitMb ? "exceed" : "on-track";
}

export function ruleStatus(rule) {
  if (!rule) return "active";
  if (rule.blocked) return "blocked";
  if (rule.throttled) return "throttled";
  if (rule.limit_mb != null) return isRuleActiveNow(rule) ? "limited" : "scheduled";
  return "active";
}
