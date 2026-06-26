const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sentryguard", {
  backendUrl: "http://127.0.0.1:8765",
  backendWsUrl: "ws://127.0.0.1:8765",
  notify: (title, body) => ipcRenderer.send("notify", { title, body }),
  notifyHighUsage: (appName, totalMb) => ipcRenderer.send("notify-high-usage", { appName, totalMb }),
  onHighUsageIgnored: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("high-usage-ignored", listener);
    return () => ipcRenderer.removeListener("high-usage-ignored", listener);
  },
  notifyGlobalLimit: (totalMb, limitMb, period) => ipcRenderer.send("notify-global-limit", { totalMb, limitMb, period }),
  onGlobalLimitIgnored: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("global-limit-ignored", listener);
    return () => ipcRenderer.removeListener("global-limit-ignored", listener);
  },
  windowControls: {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
  },
});
