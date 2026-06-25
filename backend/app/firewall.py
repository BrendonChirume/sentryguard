import subprocess

RULE_PREFIX = "SentryGuard_Block_"


class FirewallError(RuntimeError):
    pass


class FirewallManager:
    """Blocks/unblocks executables via Windows Firewall (netsh advfirewall)."""

    def __init__(self, runner=subprocess.run):
        self._run = runner

    def block(self, process_path: str, rule_name: str) -> None:
        full_name = RULE_PREFIX + rule_name
        self._exec(
            "advfirewall", "firewall", "add", "rule",
            f"name={full_name}", "dir=out", "action=block",
            f"program={process_path}", "enable=yes",
        )

    def unblock(self, rule_name: str) -> None:
        full_name = RULE_PREFIX + rule_name
        self._exec("advfirewall", "firewall", "delete", "rule", f"name={full_name}")

    def is_blocked(self, rule_name: str) -> bool:
        full_name = RULE_PREFIX + rule_name
        result = self._run(
            ["netsh", "advfirewall", "firewall", "show", "rule", f"name={full_name}"],
            capture_output=True, text=True,
        )
        return result.returncode == 0 and full_name in result.stdout

    def _exec(self, *args: str) -> None:
        result = self._run(["netsh", *args], capture_output=True, text=True)
        if result.returncode != 0:
            raise FirewallError(result.stderr.strip() or result.stdout.strip())
