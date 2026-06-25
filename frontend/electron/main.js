import { app, BrowserWindow, session, Tray, Menu, Notification, nativeImage, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === "development";

const TRAY_ICON_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKUlEQVR42mOwbvr2nxLMMHgNQAdEG0AI0NYAYsFwNmDgY4EqCWnoZSYAeWYZTjrE55oAAAAASUVORK5CYII=";

let mainWindow = null;
let tray = null;
let isQuitting = false;

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

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    frame: false,
    backgroundColor: "#0f1117",
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
  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_PNG_BASE64}`);
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
  createWindow();
  createTray();
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
