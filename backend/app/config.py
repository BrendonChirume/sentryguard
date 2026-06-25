from dataclasses import dataclass
from pathlib import Path


@dataclass
class Settings:
    poll_interval_seconds: float = 1.0
    auto_block_threshold_mb: float = 500.0
    usage_window_seconds: float = 60.0
    event_log_path: Path = Path("data/events.log")
    rules_path: Path = Path("data/rules.json")


settings = Settings()
