from fastapi.testclient import TestClient

from app import api, blocker, events
from app.database import Database
from app.models import ProcessUsage


def make_client(monkeypatch, tmp_path):
    monkeypatch.setattr("app.database.DB_PATH", tmp_path / "test.db")
    test_db = Database()

    monkeypatch.setattr(api, "db", test_db)
    monkeypatch.setattr(blocker, "db", test_db)
    monkeypatch.setattr(events, "db", test_db)

    monkeypatch.setattr(api, "rules", api.RuleStore())
    monkeypatch.setattr(api, "events", api.EventLogger())
    monkeypatch.setattr(
        api, "policy",
        api.BlockingPolicy(api.firewall, api.rules, api.events, api.throttle),
    )
    monkeypatch.setattr(api.monitor, "start", lambda: None)
    monkeypatch.setattr(api.monitor, "stop", lambda: None)
    return TestClient(api.app)


def test_get_usage_returns_snapshot(monkeypatch, tmp_path):
    client = make_client(monkeypatch, tmp_path)
    monkeypatch.setattr(
        api.monitor, "snapshot",
        lambda: [ProcessUsage(pid=1, name="app.exe", bytes_sent=1024 * 1024, bytes_recv=0)],
    )

    with client:
        resp = client.get("/usage")

    assert resp.status_code == 200
    body = resp.json()
    assert body[0]["name"] == "app.exe"
    assert body[0]["total_mb"] == 1.0


def test_block_and_unblock(monkeypatch, tmp_path):
    client = make_client(monkeypatch, tmp_path)
    monkeypatch.setattr(api.firewall, "block", lambda *a, **k: None)
    monkeypatch.setattr(api.firewall, "unblock", lambda *a, **k: None)

    with client:
        resp = client.post("/block", json={"process_name": "app.exe"})
        assert resp.status_code == 200
        assert resp.json()["blocked"] is True
        assert api.rules.get("app.exe").blocked is True

        resp = client.post("/unblock", json={"process_name": "app.exe"})
        assert resp.json()["blocked"] is False
        assert api.rules.get("app.exe").blocked is False


def test_set_limit(monkeypatch, tmp_path):
    client = make_client(monkeypatch, tmp_path)

    with client:
        resp = client.post("/limit", json={"process_name": "app.exe", "limit_mb": 50})

    assert resp.json() == {"process_name": "app.exe", "limit_mb": 50}
    assert api.rules.get("app.exe").limit_mb == 50


def test_ws_usage_streams_snapshot(monkeypatch, tmp_path):
    client = make_client(monkeypatch, tmp_path)
    monkeypatch.setattr(
        api.monitor, "snapshot",
        lambda: [ProcessUsage(pid=2, name="stream.exe", bytes_sent=2048, bytes_recv=0)],
    )

    with client:
        with client.websocket_connect("/ws/usage") as ws:
            payload = ws.receive_json()

    assert payload[0]["name"] == "stream.exe"
