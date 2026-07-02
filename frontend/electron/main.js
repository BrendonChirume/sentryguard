import { app, BrowserWindow, session, Tray, Menu, Notification, nativeImage, ipcMain, shell } from "electron";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";

const TRAY_ICON_PATH = path.join(__dirname, "tray-icon.png");
const APP_ICON_PATH = path.join(__dirname, "app-icon.png");
const BACKEND_EXE_PATH = path.join(process.resourcesPath, "backend", "sentryguard-backend.exe");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let backendProcess = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
});

const CSP = isDev
  ? "default-src 'self' http://localhost:5173 ws://localhost:5173 http://127.0.0.1:8765 ws://127.0.0.1:8765; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173"
  : "default-src 'self' http://127.0.0.1:8765 ws://127.0.0.1:8765; script-src 'self'; style-src 'self' 'unsafe-inline'";

function applyCsp() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP],
      },
    });
  });
}

function startBackend() {
  // In dev, the developer runs `python -m app.main` from backend/ themselves.
  // In production, the bundled exe (frozen via PyInstaller) ships alongside the app.
  if (isDev) return;

  const logPath = path.join(app.getPath("userData"), "backend.log");
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  const timestamp = new Date().toISOString();
  logStream.write(`\n--- SentryGuard backend starting ${timestamp} ---\n`);
  logStream.write(`exe: ${BACKEND_EXE_PATH}\n`);
  logStream.write(`exists: ${fs.existsSync(BACKEND_EXE_PATH)}\n`);

  if (!fs.existsSync(BACKEND_EXE_PATH)) {
    logStream.write("Backend exe not found at expected path, aborting spawn.\n");
    return;
  }

  backendProcess = spawn(BACKEND_EXE_PATH, [], {
    env: { ...process.env, SENTRYGUARD_DATA_DIR: app.getPath("userData") },
    windowsHide: true,
  });

  backendProcess.stdout?.pipe(logStream, { end: false });
  backendProcess.stderr?.pipe(logStream, { end: false });

  backendProcess.on("error", (err) => {
    logStream.write(`spawn error: ${err.stack || err}\n`);
  });

  backendProcess.on("exit", (code, signal) => {
    logStream.write(`backend exited: code=${code} signal=${signal}\n`);
  });
}

function stopBackend() {
  if (!backendProcess) return;
  backendProcess.kill();
  backendProcess = null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    frame: false,
    backgroundColor: "#0f1117",
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    win.hide();
  });

  mainWindow = win;
}

function createTray() {
  const icon = nativeImage.createFromPath(TRAY_ICON_PATH);
  tray = new Tray(icon);
  tray.setToolTip("SentryGuard");

  const showWindow = () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  };

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open SentryGuard", click: showWindow },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));

  tray.on("click", showWindow);
}

let pendingCheckResolvers = [];

function sendUpdateStatus(status, extra = {}) {
  const payload = { status, ...extra };
  mainWindow?.webContents.send("update-status", payload);
  if (status !== "checking" && status !== "downloading") {
    const resolvers = pendingCheckResolvers;
    pendingCheckResolvers = [];
    resolvers.forEach((resolve) => resolve(payload));
  }
}

function setupAutoUpdate() {
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => sendUpdateStatus("checking"));
  autoUpdater.on("update-available", (info) => sendUpdateStatus("available", { version: info.version }));
  autoUpdater.on("update-not-available", () => sendUpdateStatus("not-available"));
  autoUpdater.on("download-progress", (progress) => sendUpdateStatus("downloading", { percent: progress.percent }));

  autoUpdater.on("update-downloaded", (info) => {
    sendUpdateStatus("downloaded", { version: info.version });
    new Notification({
      title: "SentryGuard update ready",
      body: `Version ${info.version} will install the next time the app restarts.`,
    }).show();
  });

  autoUpdater.on("error", (err) => {
    const logPath = path.join(app.getPath("userData"), "backend.log");
    fs.appendFileSync(logPath, `\nautoUpdater error: ${err.stack || err}\n`);
    sendUpdateStatus("error", { message: err.message || String(err) });
  });

  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.sentryguard.app");
  applyCsp();
  startBackend();
  createWindow();
  createTray();
  setupAutoUpdate();
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
});

ipcMain.on("notify", (_event, { title, body }) => {
  // Skip the OS toast when the window already has focus — the in-app UI
  // (e.g. a prompt modal) is already visible in that case, so a toast on
  // top of it is redundant. Unfocused (minimized/background/other app in
  // front) is exactly when the toast is needed to get the user's attention.
  if (mainWindow?.isFocused()) return;

  const notification = new Notification({ title, body });
  notification.on("click", () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });
  notification.show();
});

ipcMain.on("notify-high-usage", (_event, { appName, totalMb, displayName }) => {
  if (!Notification.isSupported()) {
    mainWindow?.webContents.send("high-usage-ignored", { appName, totalMb, displayName });
    return;
  }

  let clicked = false;
  const notification = new Notification({
    title: "SentryGuard — High Data Usage",
    body: `${displayName || appName} is using a lot of data. Click to review.`,
  });

  notification.on("click", () => {
    clicked = true;
    mainWindow?.show();
    mainWindow?.focus();
  });

  notification.on("close", () => {
    if (!clicked) mainWindow?.webContents.send("high-usage-ignored", { appName, totalMb, displayName });
  });

  notification.show();
});

ipcMain.on("notify-global-limit", (_event, { totalMb, limitMb, period }) => {
  if (!Notification.isSupported()) {
    mainWindow?.webContents.send("global-limit-ignored", { totalMb, limitMb, period });
    return;
  }

  let clicked = false;
  const notification = new Notification({
    title: "SentryGuard — Data Limit Reached",
    body: `Combined usage has hit your ${period} limit. Click to review.`,
  });

  notification.on("click", () => {
    clicked = true;
    mainWindow?.show();
    mainWindow?.focus();
  });

  notification.on("close", () => {
    if (!clicked) mainWindow?.webContents.send("global-limit-ignored", { totalMb, limitMb, period });
  });

  notification.show();
});

ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window-maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.on("window-close", () => {
  mainWindow?.close();
});

ipcMain.handle("get-app-version", () => app.getVersion());

ipcMain.handle("open-external", (_event, url) => {
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) return;
  shell.openExternal(url);
});

ipcMain.handle("check-for-updates", async () => {
  if (isDev) {
    return { status: "not-available", devMode: true };
  }
  try {
    const resultPromise = new Promise((resolve) => pendingCheckResolvers.push(resolve));
    await autoUpdater.checkForUpdates();
    return await resultPromise;
  } catch (err) {
    pendingCheckResolvers = [];
    return { status: "error", message: err.message || String(err) };
  }
});

app.on("window-all-closed", () => {
  // Window close is intercepted to minimize to tray; only the tray's
  // Quit item sets isQuitting, so this only fires on real shutdown (e.g. macOS dock quit).
  if (process.platform !== "darwin" || isQuitting) app.quit();
});
