const BASE_URL = window.sentryguard?.backendUrl ?? "http://127.0.0.1:8765";
const WS_URL = window.sentryguard?.backendWsUrl ?? "ws://127.0.0.1:8765";

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export function blockProcess(processName) {
  return postJson("/block", { process_name: processName });
}

export function unblockProcess(processName) {
  return postJson("/unblock", { process_name: processName });
}

export function setLimit(processName, limitMb) {
  return postJson("/limit", { process_name: processName, limit_mb: limitMb });
}

export async function fetchEvents() {
  const res = await fetch(`${BASE_URL}/events`);
  if (!res.ok) throw new Error(`events failed: ${res.status}`);
  return res.json();
}

export async function fetchRules() {
  const res = await fetch(`${BASE_URL}/rules`);
  if (!res.ok) throw new Error(`rules failed: ${res.status}`);
  return res.json();
}

export async function fetchSettings() {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error(`settings failed: ${res.status}`);
  return res.json();
}

export function saveSettings(settings) {
  return postJson("/settings", settings);
}

export async function fetchConnections(processName) {
  const res = await fetch(`${BASE_URL}/connections/${encodeURIComponent(processName)}`);
  if (!res.ok) throw new Error(`connections failed: ${res.status}`);
  return res.json();
}

export async function fetchHistory(hours = 24) {
  const res = await fetch(`${BASE_URL}/history?hours=${hours}`);
  if (!res.ok) throw new Error(`history failed: ${res.status}`);
  return res.json();
}

export function saveRule(rule) {
  return postJson("/rules", rule);
}

export async function deleteRule(processName) {
  const res = await fetch(`${BASE_URL}/rules/${encodeURIComponent(processName)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete rule failed: ${res.status}`);
  return res.json();
}

export async function fetchNetworkStatus() {
  const res = await fetch(`${BASE_URL}/network/status`);
  if (!res.ok) throw new Error(`network status failed: ${res.status}`);
  return res.json();
}

export function saveNetworkDecision(decision) {
  return postJson("/network/decision", decision);
}

export async function fetchKnownNetworks() {
  const res = await fetch(`${BASE_URL}/network/known`);
  if (!res.ok) throw new Error(`known networks failed: ${res.status}`);
  return res.json();
}

export async function forgetNetwork(networkId) {
  const res = await fetch(`${BASE_URL}/network/known/${encodeURIComponent(networkId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`forget network failed: ${res.status}`);
  return res.json();
}

export function subscribeUsage(onUsage, onConnectionChange) {
  const ws = new WebSocket(`${WS_URL}/ws/usage`);
  ws.onopen = () => onConnectionChange?.(true);
  ws.onclose = () => onConnectionChange?.(false);
  ws.onerror = () => onConnectionChange?.(false);
  ws.onmessage = (event) => onUsage(JSON.parse(event.data));
  return () => ws.close();
}
