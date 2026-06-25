import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.blocker import BlockingPolicy, RuleStore
from app.database import db
from app.events import EventLogger
from app.firewall import FirewallManager
from app.monitor import NetworkMonitor

monitor = NetworkMonitor()
firewall = FirewallManager()
rules = RuleStore()
events = EventLogger()
policy = BlockingPolicy(firewall, rules, events)

SNAPSHOT_INTERVAL_SECONDS = 300


async def _policy_loop() -> None:
    while True:
        try:
            poll_interval = float(db.get_setting("poll_interval") or 2.0)
        except ValueError:
            poll_interval = 2.0

        await asyncio.sleep(poll_interval)
        policy.evaluate(monitor.snapshot())


async def _snapshot_loop() -> None:
    while True:
        await asyncio.sleep(SNAPSHOT_INTERVAL_SECONDS)
        now = time.time()
        for usage in monitor.snapshot():
            db.log_snapshot(usage.name, usage.total_mb, now)


@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor.start()
    policy_task = asyncio.create_task(_policy_loop())
    snapshot_task = asyncio.create_task(_snapshot_loop())
    try:
        yield
    finally:
        policy_task.cancel()
        snapshot_task.cancel()
        monitor.stop()


app = FastAPI(title="SentryGuard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BlockRequest(BaseModel):
    process_name: str


class LimitRequest(BaseModel):
    process_name: str
    limit_mb: float | None = None


class RuleRequest(BaseModel):
    process_name: str
    limit_mb: float | None = None
    start_time: str | None = None
    end_time: str | None = None
    category: str | None = None


class SettingsRequest(BaseModel):
    poll_interval: str
    auto_thresh: str
    start_win: str
    start_bk: str


def _usage_payload() -> list[dict]:
    return [
        {
            "pid": u.pid,
            "name": u.name,
            "bytes_sent": u.bytes_sent,
            "bytes_recv": u.bytes_recv,
            "total_mb": round(u.total_mb, 3),
        }
        for u in monitor.snapshot()
    ]


@app.get("/usage")
def get_usage() -> list[dict]:
    return _usage_payload()


@app.get("/events")
def get_events() -> list[dict]:
    return events.read_all()


@app.get("/rules")
def get_rules() -> list[dict]:
    return [vars(r) for r in rules.all()]


@app.post("/block")
def block_process(req: BlockRequest) -> dict:
    policy.block(req.process_name)
    return {"process_name": req.process_name, "blocked": True}


@app.post("/unblock")
def unblock_process(req: BlockRequest) -> dict:
    policy.unblock(req.process_name)
    return {"process_name": req.process_name, "blocked": False}


@app.post("/limit")
def set_limit(req: LimitRequest) -> dict:
    policy.set_limit(req.process_name, req.limit_mb)
    return {"process_name": req.process_name, "limit_mb": req.limit_mb}


@app.post("/rules")
def upsert_rule(req: RuleRequest) -> dict:
    policy.set_rule(req.process_name, req.limit_mb, req.start_time, req.end_time, req.category)
    return {"process_name": req.process_name}


@app.delete("/rules/{process_name}")
def delete_rule(process_name: str) -> dict:
    policy.delete_rule(process_name)
    return {"process_name": process_name, "deleted": True}


@app.get("/history")
def get_history(process_name: str | None = None, hours: float = 24.0) -> list[dict]:
    since = time.time() - hours * 3600
    return db.get_history(process_name=process_name, since=since)


@app.get("/settings")
def get_settings() -> dict:
    return {
        "poll_interval": db.get_setting("poll_interval") or "2.0",
        "auto_thresh": db.get_setting("auto_thresh") or "500.0",
        "start_win": db.get_setting("start_win") or "false",
        "start_bk": db.get_setting("start_bk") or "true",
    }


@app.post("/settings")
def save_settings(req: SettingsRequest) -> dict:
    db.set_setting("poll_interval", req.poll_interval)
    db.set_setting("auto_thresh", req.auto_thresh)
    db.set_setting("start_win", req.start_win)
    db.set_setting("start_bk", req.start_bk)
    return {"status": "ok"}


@app.get("/connections/{process_name}")
def get_connections(process_name: str) -> list[dict]:
    return monitor.get_connections(process_name)


@app.websocket("/ws/usage")
async def ws_usage(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(_usage_payload())
            
            try:
                poll = float(db.get_setting("poll_interval") or 2.0)
            except ValueError:
                poll = 2.0
                
            await asyncio.sleep(poll)
    except WebSocketDisconnect:
        pass
