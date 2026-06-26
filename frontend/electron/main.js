import { app, BrowserWindow, session, Tray, Menu, Notification, nativeImage, ipcMain } from "electron";
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

app.whenReady().then(() => {
  applyCsp();
  startBackend();
  createWindow();
  createTray();
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
});

ipcMain.on("notify", (_event, { title, body }) => {
  const notification = new Notification({ title, body });
  notification.on("click", () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
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

app.on("window-all-closed", () => {
  // Window close is intercepted to minimize to tray; only the tray's
  // Quit item sets isQuitting, so this only fires on real shutdown (e.g. macOS dock quit).
  if (process.platform !== "darwin" || isQuitting) app.quit();
});
