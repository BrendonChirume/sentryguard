!macro customInstall
  ; The backend needs admin rights for netsh/QoS calls, but the Electron UI
  ; must NOT run elevated — Windows Action Center can't deliver toast-click
  ; activation into an elevated window (UIPI), which made every notification
  ; click relaunch the whole app via UAC instead of focusing it. So the
  ; backend runs as its own Scheduled Task (RunLevel=Highest, created once
  ; here while the installer itself is already elevated) instead of as an
  ; Electron child process. Electron just does `schtasks /run` to start it.
  DetailPrint "Registering SentryGuard backend service task..."
  ; $PROGRAMDATA isn't a built-in NSIS variable — $APPDATA resolves to the
  ; machine-wide ProgramData folder once SetShellVarContext is "all" (which
  ; it is here, since this perMachine install is already elevated).
  SetShellVarContext all
  nsExec::Exec 'schtasks /create /tn "SentryGuardBackend" /tr "\"$INSTDIR\resources\backend\sentryguard-backend.exe\" --data-dir \"$APPDATA\SentryGuard\"" /sc onlogon /rl highest /f'
  Pop $0
!macroend

!macro customUnInstall
  DetailPrint "Removing SentryGuard backend task, firewall rules, and QoS throttle policies..."
  nsExec::Exec 'schtasks /end /tn "SentryGuardBackend"'
  Pop $0
  nsExec::Exec 'schtasks /delete /tn "SentryGuardBackend" /f'
  Pop $0
  nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command "Get-NetFirewallRule -DisplayName \"SentryGuard_Block_*\" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue; Get-NetQosPolicy -Name \"SentryGuard_Throttle_*\" -ErrorAction SilentlyContinue | Remove-NetQosPolicy -Confirm:$$false -ErrorAction SilentlyContinue"'
  Pop $0
!macroend
