!macro customUnInstall
  DetailPrint "Removing SentryGuard firewall rules and QoS throttle policies..."
  nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command "Get-NetFirewallRule -DisplayName \"SentryGuard_Block_*\" -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue; Get-NetQosPolicy -Name \"SentryGuard_Throttle_*\" -ErrorAction SilentlyContinue | Remove-NetQosPolicy -Confirm:$$false -ErrorAction SilentlyContinue"'
  Pop $0
!macroend
