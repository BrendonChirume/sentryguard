# Network Monitor App

## Goal
Windows app to track, limit, and block applications using too much data.

## Stack
- Backend: Python (psutil, subprocess/netsh)
- Frontend: React + Electron
- OS integration: Windows Firewall via netsh advfirewall

## Key features
- Per-process network usage monitoring
- Auto-block when app exceeds MB threshold
- Manual block/limit/unblock via UI
- Event log of all actions

## Environment Note
- Code is being written in WSL (Ubuntu) via Claude Code
- Target runtime is Windows (native Python, not WSL)
- Do NOT test pydivert/netsh calls in WSL — they are Windows-only
- All pydivert/netsh code should be written for Windows Python (CPython)
- Final testing must happen in a Windows terminal with admin privileges