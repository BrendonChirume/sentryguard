from app.database import db
from app.models import Event


class EventLogger:
    def __init__(self, log_path=None):
        pass # Replaced by SQLite database

    def log(self, event: Event) -> None:
        db.log_event(event)

    def read_all(self) -> list[dict]:
        return db.get_recent_events(100)
