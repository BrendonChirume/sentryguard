const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sentryguard", {
  backendUrl: "http://127.0.0.1:8765",
  backendWsUrl: "ws://127.0.0.1:8765",
  notify: (title, body) => ipcRenderer.send("notify", { title, body }),
  windowControls: {
    minimize: () => ipcRenderer.send("window-minimize"),
    maximize: () => ipcRenderer.send("window-maximize"),
    close: () => ipcRenderer.send("window-close"),
  },
});
