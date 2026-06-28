import subprocess

POLICY_PREFIX = "SentryGuard_Throttle_"


class ThrottleError(RuntimeError):
    pass


class ThrottleManager:
    """Caps a process's bandwidth via Windows' QoS Packet Scheduler.

    Uses the built-in NetQos PowerShell module (New-NetQosPolicy /
    Remove-NetQosPolicy) to apply a per-executable throttle rate — the same
    native mechanism Windows itself uses for per-app bandwidth policies, so
    no kernel driver or packet-level shaping is needed.
    """

    def __init__(self, runner=subprocess.run):
        self._run = runner

    def throttle(self, process_path: str, rule_name: str, kbps: float) -> None:
        policy_name = POLICY_PREFIX + rule_name
        bits_per_second = int(kbps * 1024 * 8)
        self._remove_if_exists(policy_name)
        self._powershell(
            "New-NetQosPolicy",
            "-Name", f'"{policy_name}"',
            "-AppPathNameMatchCondition", f'"{process_path}"',
            "-ThrottleRateActionBitsPerSecond", str(bits_per_second),
            "-PolicyStore", "ActiveStore",
        )

    def unthrottle(self, rule_name: str) -> None:
        self._remove_if_exists(POLICY_PREFIX + rule_name)

    def remove_all(self) -> None:
        """Removes every QoS policy this app created, including ones orphaned
        by a crash or kill — netsh advfirewall reset never touches these."""
        self._powershell_query(
            "Get-NetQosPolicy", "|", "Where-Object", f'{{$_.Name -like "{POLICY_PREFIX}*"}}',
            "|", "Remove-NetQosPolicy", "-Confirm:$false",
        )

    def is_throttled(self, rule_name: str) -> bool:
        policy_name = POLICY_PREFIX + rule_name
        result = self._powershell_query("Get-NetQosPolicy", "-Name", f'"{policy_name}"')
        return result.returncode == 0

    def _remove_if_exists(self, policy_name: str) -> None:
        self._powershell_query("Remove-NetQosPolicy", "-Name", f'"{policy_name}"', "-Confirm:$false")

    def _powershell(self, *args: str) -> None:
        result = self._powershell_query(*args)
        if result.returncode != 0:
            raise ThrottleError(result.stderr.strip() or result.stdout.strip())

    def _powershell_query(self, *args: str):
        return self._run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", " ".join(args)],
            capture_output=True, text=True,
        )
