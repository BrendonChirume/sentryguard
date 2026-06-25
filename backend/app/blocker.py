from datetime import datetime

import psutil

from app.database import db
from app.events import EventLogger
from app.firewall import FirewallManager
from app.models import ActionType, BlockRule, Event, ProcessUsage


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
    ):
        self._firewall = firewall
        self._rules = rules
        self._events = events

    def evaluate(self, usages: list[ProcessUsage]) -> None:
        try:
            auto_block_threshold_mb = float(db.get_setting("auto_thresh") or 500.0)
        except ValueError:
            auto_block_threshold_mb = 500.0

        for usage in usages:
            rule = self._rules.get(usage.name)
            if rule.blocked:
                continue
            if not self._in_window(rule):
                continue

            limit = rule.limit_mb if rule.limit_mb is not None else auto_block_threshold_mb
            if usage.total_mb >= limit:
                self.block(usage.name, usage.pid, auto=True, detail=f"{usage.total_mb:.1f} MB >= {limit} MB")

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
        process_path = self._resolve_path(process_name, pid)
        self._firewall.block(process_path, process_name)

        rule = self._rules.get(process_name)
        rule.blocked = True
        self._rules.set(rule)

        self._events.log(Event(
            action=ActionType.AUTO_BLOCK if auto else ActionType.BLOCK,
            process_name=process_name,
            detail=detail,
        ))

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
    ) -> None:
        rule = self._rules.get(process_name)
        rule.limit_mb = limit_mb
        rule.start_time = start_time
        rule.end_time = end_time
        rule.category = category
        self._rules.set(rule)
        self._events.log(Event(
            action=ActionType.LIMIT,
            process_name=process_name,
            detail=f"rule updated: limit={limit_mb}MB window={start_time or '-'}-{end_time or '-'} category={category or '-'}",
        ))

    def delete_rule(self, process_name: str) -> None:
        rule = self._rules.get(process_name)
        if rule.blocked:
            self._firewall.unblock(process_name)
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
        return process_name
