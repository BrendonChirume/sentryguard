from dataclasses import dataclass, field
from enum import Enum
from time import time


class ActionType(str, Enum):
    BLOCK = "block"
    UNBLOCK = "unblock"
    LIMIT = "limit"
    AUTO_BLOCK = "auto_block"
    THROTTLE = "throttle"
    UNTHROTTLE = "unthrottle"


@dataclass
class ProcessUsage:
    pid: int
    name: str
    description: str | None = None  # human-friendly app name (e.g. "Discord"), when resolvable
    bytes_sent: int = 0
    bytes_recv: int = 0

    @property
    def total_bytes(self) -> int:
        return self.bytes_sent + self.bytes_recv

    @property
    def total_mb(self) -> float:
        return self.total_bytes / (1024 * 1024)


@dataclass
class BlockRule:
    process_name: str
    limit_mb: float | None = None
    blocked: bool = False
    start_time: str | None = None  # "HH:MM", 24h
    end_time: str | None = None  # "HH:MM", 24h
    category: str | None = None
    throttle_kbps: float | None = None  # speed cap to apply once limit_mb is hit, instead of blocking
    throttled: bool = False  # whether the throttle is currently in effect
    notify_muted: bool = False  # suppress high-usage notifications for this process


@dataclass
class Event:
    action: ActionType
    process_name: str
    detail: str = ""
    timestamp: float = field(default_factory=time)
