from datetime import datetime

import psutil

from app.database import db
from app.events import EventLogger
from app.firewall import FirewallManager
from app.models import ActionType, BlockRule, Event, ProcessUsage
from app.throttle import ThrottleManager


class ProcessPathUnresolvedError(RuntimeError):
    pass


class RuleStore:
    """Persists manual block/limit rules via SQLite."""

    def __init__(self, path=None):
        pass

    def save(self) -> None:
        pass  # Handled automatically in setter

    def get(self, process_name: str) -> BlockRule:
        rules = db.get_all_rules()
        for r in rules:
            if r.process_name == process_name:
                return r
        return BlockRule(process_name=process_name)

    def set(self, rule: BlockRule):
        db.save_rule(rule)

    def all(self) -> list[BlockRule]:
        return db.get_all_rules()


class BlockingPolicy:
    """Decides when to auto-block a process and applies manual rules."""

    def __init__(
        self,
        firewall: FirewallManager,
        rules: RuleStore,
        events: EventLogger,
        throttle: ThrottleManager,
    ):
        self._firewall = firewall
        self._rules = rules
        self._events = events
        self._throttle = throttle

    def evaluate(
        self, usages: list[ProcessUsage], network_limiting_enabled: bool = True,
        current_network_id: str | None = None,
    ) -> None:
        """Applies manual rules (always) and the global auto-limit threshold
        (only when network_limiting_enabled — e.g. the user opted out of
        standard limiting for the currently connected network).

        The global threshold throttles rather than blocks outright — only an
        explicit "Block" rule (set manually, or a limit rule with no throttle
        speed configured) results in a hard firewall block."""
        try:
            auto_threshold_mb = float(db.get_setting("auto_thresh") or 500.0)
        except ValueError:
            auto_threshold_mb = 500.0
        try:
            auto_throttle_kbps = float(db.get_setting("auto_throttle_kbps") or 100.0)
        except ValueError:
            auto_throttle_kbps = 100.0

        for usage in usages:
            rule = self._rules.get(usage.name)
            if rule.blocked:
                continue
            if not self._in_window(rule):
                continue
            if rule.ssids and current_network_id not in rule.ssids:
                continue

            has_explicit_rule = rule.limit_mb is not None or rule.throttle_kbps is not None
            if has_explicit_rule:
                limit = rule.limit_mb if rule.limit_mb is not None else 0
            elif network_limiting_enabled:
                limit = auto_threshold_mb
            else:
                continue  # no explicit rule, and standard limiting is off for this network

            if usage.total_mb < limit:
                continue

            if not has_explicit_rule:
                # No manual rule — the global threshold limits speed, it never blocks outright.
                if not rule.throttled:
                    self.throttle_process(usage.name, usage.pid, auto_throttle_kbps, auto=True,
                                           detail=f"{usage.total_mb:.1f} MB >= {limit} MB (global threshold)")
            elif rule.throttle_kbps is not None:
                if not rule.throttled:
                    self.throttle_process(usage.name, usage.pid, rule.throttle_kbps, auto=True,
                                           detail=f"{usage.total_mb:.1f} MB >= {limit} MB")
            else:
                self.block(usage.name, usage.pid, auto=True, detail=f"{usage.total_mb:.1f} MB >= {limit} MB")

    def apply_target_pacing(self, usages: list[ProcessUsage], current_network_id: str | None = None) -> None:
        """For rules with a daily `target_mb` budget, recomputes a throttle rate
        that would land usage right at the target by end of day, proportional to
        how far ahead/behind pace the process currently is. If it's already over
        budget — throttling alone can no longer bring it back under target by
        midnight — it blocks instead."""
        now = datetime.now()
        seconds_elapsed = now.hour * 3600 + now.minute * 60 + now.second
        seconds_remaining = 86400 - seconds_elapsed
        if seconds_remaining <= 0:
            return

        for usage in usages:
            rule = self._rules.get(usage.name)
            if rule.target_mb is None or rule.blocked:
                continue
            if rule.ssids and current_network_id not in rule.ssids:
                continue

            remaining_mb = rule.target_mb - usage.total_mb
            if remaining_mb <= 0:
                self.block(usage.name, usage.pid, auto=True,
                           detail=f"{usage.total_mb:.1f} MB already over {rule.target_mb} MB daily target")
                continue

            allowed_kbps = (remaining_mb * 1024 * 8) / seconds_remaining
            self.throttle_process(usage.name, usage.pid, allowed_kbps, auto=True,
                                   detail=f"pacing toward {rule.target_mb} MB/day target ({allowed_kbps:.1f} KB/s)")

    @staticmethod
    def _in_window(rule: BlockRule) -> bool:
        """Whether the rule should be enforced right now. No window means always active."""
        if not rule.start_time or not rule.end_time:
            return True
        now = datetime.now().strftime("%H:%M")
        if rule.start_time <= rule.end_time:
            return rule.start_time <= now <= rule.end_time
        return now >= rule.start_time or now <= rule.end_time  # window spans midnight

    def block(self, process_name: str, pid: int | None = None, auto: bool = False, detail: str = "") -> None:
        try:
            process_path = self._resolve_path(process_name, pid)
        except ProcessPathUnresolvedError:
            return
        self._firewall.block(process_path, process_name)

        rule = self._rules.get(process_name)
        rule.blocked = True
        self._rules.set(rule)

        self._events.log(Event(
            action=ActionType.AUTO_BLOCK if auto else ActionType.BLOCK,
            process_name=process_name,
            detail=detail,
        ))

    def throttle_process(
        self, process_name: str, pid: int | None, kbps: float, auto: bool = False, detail: str = ""
    ) -> None:
        try:
            process_path = self._resolve_path(process_name, pid)
        except ProcessPathUnresolvedError:
            return
        self._throttle.throttle(process_path, process_name, kbps)

        rule = self._rules.get(process_name)
        rule.throttled = True
        self._rules.set(rule)

        self._events.log(Event(
            action=ActionType.THROTTLE,
            process_name=process_name,
            detail=detail or f"throttled to {kbps} KB/s",
        ))

    def unthrottle_process(self, process_name: str) -> None:
        self._throttle.unthrottle(process_name)

        rule = self._rules.get(process_name)
        rule.throttled = False
        self._rules.set(rule)

        self._events.log(Event(action=ActionType.UNTHROTTLE, process_name=process_name))

    def unblock(self, process_name: str) -> None:
        self._firewall.unblock(process_name)

        rule = self._rules.get(process_name)
        rule.blocked = False
        self._rules.set(rule)

        self._events.log(Event(action=ActionType.UNBLOCK, process_name=process_name))

    def set_rule(
        self,
        process_name: str,
        limit_mb: float | None,
        start_time: str | None,
        end_time: str | None,
        category: str | None,
        throttle_kbps: float | None = None,
        ssids: list[str] | None = None,
        target_mb: float | None = None,
    ) -> None:
        rule = self._rules.get(process_name)
        rule.limit_mb = limit_mb
        rule.start_time = start_time
        rule.end_time = end_time
        rule.category = category
        rule.throttle_kbps = throttle_kbps
        rule.ssids = ssids or []
        rule.target_mb = target_mb
        if throttle_kbps is None and rule.throttled:
            # Throttle config was removed/cleared — drop the active QoS policy too.
            self._throttle.unthrottle(process_name)
            rule.throttled = False
        self._rules.set(rule)
        self._events.log(Event(
            action=ActionType.LIMIT,
            process_name=process_name,
            detail=(
                f"rule updated: limit={limit_mb}MB window={start_time or '-'}-{end_time or '-'} "
                f"category={category or '-'} throttle={throttle_kbps or '-'}KB/s"
            ),
        ))

    def delete_rule(self, process_name: str) -> None:
        rule = self._rules.get(process_name)
        if rule.blocked:
            self._firewall.unblock(process_name)
        if rule.throttled:
            self._throttle.unthrottle(process_name)
        db.delete_rule(process_name)
        self._events.log(Event(action=ActionType.UNBLOCK, process_name=process_name, detail="rule deleted"))

    def set_limit(self, process_name: str, limit_mb: float | None) -> None:
        rule = self._rules.get(process_name)
        rule.limit_mb = limit_mb
        self._rules.set(rule)
        self._events.log(Event(
            action=ActionType.LIMIT,
            process_name=process_name,
            detail=f"limit={limit_mb}MB" if limit_mb is not None else "limit cleared",
        ))

    def set_notify_muted(self, process_name: str, muted: bool) -> None:
        rule = self._rules.get(process_name)
        rule.notify_muted = muted
        self._rules.set(rule)

    @staticmethod
    def _resolve_path(process_name: str, pid: int | None) -> str:
        if pid is not None:
            try:
                return psutil.Process(pid).exe()
            except psutil.NoSuchProcess:
                pass
        for proc in psutil.process_iter(["name", "exe"]):
            if proc.info["name"] == process_name and proc.info["exe"]:
                return proc.info["exe"]
        raise ProcessPathUnresolvedError(
            f"could not resolve an executable path for {process_name!r} "
            "(process may have already exited)"
        )
