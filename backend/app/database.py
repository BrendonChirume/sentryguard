import os
import sqlite3
import threading
from pathlib import Path
from typing import Any

from app.models import ActionType, BlockRule, Event

# In production, Electron sets SENTRYGUARD_DATA_DIR to a writable per-user
# directory (app.getPath('userData')) since the install directory usually
# isn't writable. Falls back to a cwd-relative "data" dir for local dev/tests.
DATA_DIR = Path(os.environ["SENTRYGUARD_DATA_DIR"]) if os.environ.get("SENTRYGUARD_DATA_DIR") else Path("data")
DB_PATH = DATA_DIR / "sentryguard.db"


class Database:
    def __init__(self):
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.local = threading.local()
        self._init_db()

    @property
    def conn(self) -> sqlite3.Connection:
        if not hasattr(self.local, "conn"):
            self.local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            self.local.conn.row_factory = sqlite3.Row
        return self.local.conn

    def _init_db(self):
        c = self.conn.cursor()
        
        # Rules table
        c.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                process_name TEXT PRIMARY KEY,
                limit_mb REAL,
                blocked INTEGER DEFAULT 0
            )
        """)
        
        # Events table
        c.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT,
                process_name TEXT,
                detail TEXT,
                timestamp REAL
            )
        """)
        
        # Settings table (Key-Value pair)
        c.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        # Historical usage snapshots
        c.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                process_name TEXT,
                total_mb REAL,
                timestamp REAL
            )
        """)

        # Remembered network decisions (limit-on-connect or keep open)
        c.execute("""
            CREATE TABLE IF NOT EXISTS networks (
                network_id TEXT PRIMARY KEY,
                name TEXT,
                limit_enabled INTEGER,
                decided_at REAL
            )
        """)

        for ddl in (
            "ALTER TABLE rules ADD COLUMN start_time TEXT",
            "ALTER TABLE rules ADD COLUMN end_time TEXT",
            "ALTER TABLE rules ADD COLUMN category TEXT",
            "ALTER TABLE rules ADD COLUMN throttle_kbps REAL",
            "ALTER TABLE rules ADD COLUMN throttled INTEGER DEFAULT 0",
        ):
            try:
                c.execute(ddl)
            except sqlite3.OperationalError:
                pass  # column already exists

        self.conn.commit()

        # Seed default settings if empty
        if self.get_setting("poll_interval") is None:
            self.set_setting("poll_interval", "2.0")
            self.set_setting("auto_thresh", "500.0")
            self.set_setting("start_win", "false")
            self.set_setting("start_bk", "true")

    # -- Rules --
    def get_all_rules(self) -> list[BlockRule]:
        c = self.conn.cursor()
        c.execute("SELECT * FROM rules")
        rules = []
        for row in c.fetchall():
            rules.append(BlockRule(
                process_name=row["process_name"],
                limit_mb=row["limit_mb"],
                blocked=bool(row["blocked"]),
                start_time=row["start_time"],
                end_time=row["end_time"],
                category=row["category"],
                throttle_kbps=row["throttle_kbps"],
                throttled=bool(row["throttled"]),
            ))
        return rules

    def save_rule(self, rule: BlockRule):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO rules (process_name, limit_mb, blocked, start_time, end_time, category, throttle_kbps, throttled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(process_name) DO UPDATE SET
                limit_mb=excluded.limit_mb,
                blocked=excluded.blocked,
                start_time=excluded.start_time,
                end_time=excluded.end_time,
                category=excluded.category,
                throttle_kbps=excluded.throttle_kbps,
                throttled=excluded.throttled
        """, (
            rule.process_name, rule.limit_mb, int(rule.blocked), rule.start_time, rule.end_time,
            rule.category, rule.throttle_kbps, int(rule.throttled),
        ))
        self.conn.commit()

    def delete_rule(self, process_name: str):
        c = self.conn.cursor()
        c.execute("DELETE FROM rules WHERE process_name = ?", (process_name,))
        self.conn.commit()

    # -- Events --
    def log_event(self, event: Event):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO events (action, process_name, detail, timestamp)
            VALUES (?, ?, ?, ?)
        """, (event.action.value, event.process_name, event.detail, event.timestamp))
        self.conn.commit()

    def get_recent_events(self, limit: int = 100) -> list[dict]:
        c = self.conn.cursor()
        c.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,))
        events = []
        for row in c.fetchall():
            events.append({
                "action": row["action"],
                "process_name": row["process_name"],
                "detail": row["detail"],
                "timestamp": row["timestamp"],
            })
        return events

    # -- Snapshots --
    def log_snapshot(self, process_name: str, total_mb: float, timestamp: float):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO snapshots (process_name, total_mb, timestamp)
            VALUES (?, ?, ?)
        """, (process_name, total_mb, timestamp))
        self.conn.commit()

    def get_history(self, process_name: str | None = None, since: float | None = None) -> list[dict]:
        c = self.conn.cursor()
        query = "SELECT process_name, total_mb, timestamp FROM snapshots WHERE 1=1"
        params: list[Any] = []
        if process_name is not None:
            query += " AND process_name = ?"
            params.append(process_name)
        if since is not None:
            query += " AND timestamp >= ?"
            params.append(since)
        query += " ORDER BY timestamp ASC"
        c.execute(query, params)
        return [
            {"process_name": row["process_name"], "total_mb": row["total_mb"], "timestamp": row["timestamp"]}
            for row in c.fetchall()
        ]

    # -- Networks --
    def get_network_decision(self, network_id: str) -> dict | None:
        c = self.conn.cursor()
        c.execute("SELECT * FROM networks WHERE network_id = ?", (network_id,))
        row = c.fetchone()
        if row is None:
            return None
        return {
            "network_id": row["network_id"],
            "name": row["name"],
            "limit_enabled": bool(row["limit_enabled"]),
            "decided_at": row["decided_at"],
        }

    def save_network_decision(self, network_id: str, name: str, limit_enabled: bool, decided_at: float):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO networks (network_id, name, limit_enabled, decided_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(network_id) DO UPDATE SET
                name=excluded.name,
                limit_enabled=excluded.limit_enabled,
                decided_at=excluded.decided_at
        """, (network_id, name, int(limit_enabled), decided_at))
        self.conn.commit()

    def get_all_networks(self) -> list[dict]:
        c = self.conn.cursor()
        c.execute("SELECT * FROM networks ORDER BY decided_at DESC")
        return [
            {
                "network_id": row["network_id"],
                "name": row["name"],
                "limit_enabled": bool(row["limit_enabled"]),
                "decided_at": row["decided_at"],
            }
            for row in c.fetchall()
        ]

    def delete_network(self, network_id: str):
        c = self.conn.cursor()
        c.execute("DELETE FROM networks WHERE network_id = ?", (network_id,))
        self.conn.commit()

    # -- Settings --
    def get_setting(self, key: str) -> str | None:
        c = self.conn.cursor()
        c.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = c.fetchone()
        return row["value"] if row else None

    def set_setting(self, key: str, value: str):
        c = self.conn.cursor()
        c.execute("""
            INSERT INTO settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
        """, (key, value))
        self.conn.commit()

db = Database()
