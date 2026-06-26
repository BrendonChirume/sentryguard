import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.blocker import BlockingPolicy, RuleStore
from app.database import db
from app.events import EventLogger
from app.firewall import FirewallManager
from app.monitor import NetworkMonitor
from app.network import get_current_network
from app.throttle import ThrottleManager

monitor = NetworkMonitor()
firewall = FirewallManager()
throttle = ThrottleManager()
rules = RuleStore()
events = EventLogger()
policy = BlockingPolicy(firewall, rules, events, throttle)

SNAPSHOT_INTERVAL_SECONDS = 300
NETWORK_CHECK_INTERVAL_SECONDS = 15

_current_network_id: str | None = None
_current_network_name: str | None = None
_network_limiting_enabled = True


async def _policy_loop() -> None:
    while True:
        try:
            poll_interval = float(db.get_setting("poll_interval") or 2.0)
        except ValueError:
            poll_interval = 2.0

        await asyncio.sleep(poll_interval)
        policy.evaluate(monitor.snapshot(), _network_limiting_enabled)


async def _snapshot_loop() -> None:
    while True:
        await asyncio.sleep(SNAPSHOT_INTERVAL_SECONDS)
        now = time.time()
        for usage in monitor.snapshot():
            db.log_snapshot(usage.name, usage.total_mb, now)


async def _network_loop() -> None:
    global _current_network_id, _current_network_name, _network_limiting_enabled
    while True:
        network_id, name = get_current_network()
        if network_id != _current_network_id:
            _current_network_id = network_id
            _current_network_name = name
            decision = db.get_network_decision(network_id)
            # Default to limiting ON while a brand-new network awaits the user's decision.
            _network_limiting_enabled = decision["limit_enabled"] if decision else True
        await asyncio.sleep(NETWORK_CHECK_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor.start()
    policy_task = asyncio.create_task(_policy_loop())
    snapshot_task = asyncio.create_task(_snapshot_loop())
    network_task = asyncio.create_task(_network_loop())
    try:
        yield
    finally:
        policy_task.cancel()
        snapshot_task.cancel()
        network_task.cancel()
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
    throttle_kbps: float | None = None


class NotifyMuteRequest(BaseModel):
    process_name: str
    muted: bool


class NetworkDecisionRequest(BaseModel):
    network_id: str
    name: str
    limit_enabled: bool


class SettingsRequest(BaseModel):
    poll_interval: str
    auto_thresh: str
    start_win: str
    start_bk: str
    global_limit_mb: str
    global_limit_period: str


class ThrottleAllRequest(BaseModel):
    kbps: float


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
    policy.set_rule(req.process_name, req.limit_mb, req.start_time, req.end_time, req.category, req.throttle_kbps)
    return {"process_name": req.process_name}


@app.delete("/rules/{process_name}")
def delete_rule(process_name: str) -> dict:
    policy.delete_rule(process_name)
    return {"process_name": process_name, "deleted": True}


@app.post("/notify-mute")
def set_notify_muted(req: NotifyMuteRequest) -> dict:
    policy.set_notify_muted(req.process_name, req.muted)
    return {"process_name": req.process_name, "muted": req.muted}


@app.post("/unthrottle")
def unthrottle_process(req: BlockRequest) -> dict:
    policy.unthrottle_process(req.process_name)
    return {"process_name": req.process_name, "throttled": False}


@app.get("/history")
def get_history(process_name: str | None = None, hours: float = 24.0) -> list[dict]:
    since = time.time() - hours * 3600
    return db.get_history(process_name=process_name, since=since)


@app.get("/global-usage")
def get_global_usage(period: str = "weekly") -> dict:
    now = datetime.now()
    if period == "monthly":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        period_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    total_mb = db.get_period_usage_mb(period_start.timestamp())
    return {"total_mb": round(total_mb, 3), "period": period, "period_start": period_start.timestamp()}


@app.get("/network/status")
def get_network_status() -> dict:
    decision = db.get_network_decision(_current_network_id) if _current_network_id else None
    return {
        "network_id": _current_network_id,
        "name": _current_network_name,
        "known": decision is not None,
        "limit_enabled": _network_limiting_enabled,
        "needs_prompt": _current_network_id is not None and decision is None,
    }


@app.post("/network/decision")
def save_network_decision(req: NetworkDecisionRequest) -> dict:
    global _network_limiting_enabled
    db.save_network_decision(req.network_id, req.name, req.limit_enabled, time.time())
    if req.network_id == _current_network_id:
        _network_limiting_enabled = req.limit_enabled
    return {"status": "ok"}


@app.get("/network/known")
def get_known_networks() -> list[dict]:
    return db.get_all_networks()


@app.delete("/network/known/{network_id}")
def forget_network(network_id: str) -> dict:
    global _network_limiting_enabled
    db.delete_network(network_id)
    if network_id == _current_network_id:
        _network_limiting_enabled = True
    return {"network_id": network_id, "deleted": True}


@app.get("/settings")
def get_settings() -> dict:
    return {
        "poll_interval": db.get_setting("poll_interval") or "2.0",
        "auto_thresh": db.get_setting("auto_thresh") or "500.0",
        "start_win": db.get_setting("start_win") or "false",
        "start_bk": db.get_setting("start_bk") or "true",
        "global_limit_mb": db.get_setting("global_limit_mb") or "",
        "global_limit_period": db.get_setting("global_limit_period") or "weekly",
    }


@app.post("/settings")
def save_settings(req: SettingsRequest) -> dict:
    db.set_setting("poll_interval", req.poll_interval)
    db.set_setting("auto_thresh", req.auto_thresh)
    db.set_setting("start_win", req.start_win)
    db.set_setting("start_bk", req.start_bk)
    db.set_setting("global_limit_mb", req.global_limit_mb)
    db.set_setting("global_limit_period", req.global_limit_period)
    return {"status": "ok"}


@app.post("/throttle-all")
def throttle_all(req: ThrottleAllRequest) -> dict:
    throttled = 0
    for usage in monitor.snapshot():
        rule = rules.get(usage.name)
        if rule.blocked:
            continue
        policy.throttle_process(
            usage.name, usage.pid, req.kbps,
            detail=f"global data limit reached, throttled to {req.kbps} KB/s",
        )
        throttled += 1
    return {"throttled": throttled, "kbps": req.kbps}


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
