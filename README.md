# SentryGuard

A Windows desktop app for monitoring per-application network usage, with the ability to block, throttle, or schedule limits on apps that use too much bandwidth.

Built with a Python/FastAPI backend (live packet capture via WinDivert, SQLite-backed rules/events/settings) and a React + Electron frontend (frameless window, glassmorphism UI, system tray, native notifications).

## Features

- **Per-process network monitoring** — live upload/download tracking per running process, with a 24-hour usage history.
- **Block, limit, or throttle** any process — hard-block via Windows Firewall, cap its data usage, or throttle its bandwidth (via Windows' QoS Packet Scheduler) instead of blocking outright once a limit is hit.
- **Rules engine** — persistent per-process rules with optional time windows (e.g. only limit an app 9am–5pm) and categories.
- **Auto-block threshold** — automatically blocks any process that exceeds a configurable daily usage threshold, with a proactive "high usage" notification before it kicks in.
- **Network-aware limiting** — detects the current Wi-Fi/wired network and remembers whether to apply standard limits on it, so you're not re-prompted every time you reconnect.
- **Connection inspector** — view a process's active TCP/UDP connections with reverse-DNS hostname resolution.
- **Event log** — full audit trail of every block/unblock/limit/throttle action.
- **Desktop integration** — minimizes to the system tray instead of quitting, and fires native Windows notifications for auto-blocks and high-usage warnings.

## Stack

- **Backend**: Python, FastAPI, `psutil`, `pydivert` (WinDivert) for packet capture, SQLite for persistence, `netsh advfirewall` for blocking, Windows QoS policies for throttling.
- **Frontend**: React 19, Vite, Tailwind CSS, Electron.

## Requirements

- Windows 10/11
- **Administrator privileges** — packet capture, firewall rules, and QoS throttling all require elevation. The packaged app requests this automatically.

## Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m app.main      # serves on http://127.0.0.1:8765
```

Run tests with `pytest` from `backend/`.

### Frontend

```bash
cd frontend
npm install
npm run electron:dev    # starts Vite + Electron together
```

The frontend expects the backend already running at `127.0.0.1:8765` in dev mode.

## Building a production installer

```bash
# 1. Freeze the backend into a standalone executable
cd backend
pip install -r requirements-build.txt
pyinstaller sentryguard.spec

# 2. Build the Electron installer (bundles the frozen backend)
cd ../frontend
npm run electron:build
```

The NSIS installer is produced under `frontend/release/`. The packaged app launches as an admin-elevated process and auto-starts the bundled backend; its data lives in `%APPDATA%\SentryGuard`, and backend logs are written to `%APPDATA%\SentryGuard\backend.log`.

## Project layout

```
backend/    FastAPI app, packet capture, firewall/throttle control, SQLite persistence
frontend/   React UI + Electron shell
```
