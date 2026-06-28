import pytest

from app.blocker import BlockingPolicy, RuleStore
from app.events import EventLogger
from app.models import BlockRule, ProcessUsage


@pytest.fixture(autouse=True)
def fake_resolved_paths(monkeypatch):
    """Tests use synthetic pids/names with no real backing process, so make
    _resolve_path resolve them as if their exe path were just their name."""
    monkeypatch.setattr(
        "app.blocker.BlockingPolicy._resolve_path",
        staticmethod(lambda process_name, pid: process_name),
    )


class FakeFirewall:
    def __init__(self):
        self.blocked = []
        self.unblocked = []

    def block(self, process_path, rule_name):
        self.blocked.append(rule_name)

    def unblock(self, rule_name):
        self.unblocked.append(rule_name)


class FakeThrottle:
    def __init__(self):
        self.throttled = []
        self.unthrottled = []

    def throttle(self, process_path, rule_name, kbps):
        self.throttled.append((rule_name, kbps))

    def unthrottle(self, rule_name):
        self.unthrottled.append(rule_name)


ALL_TEST_PROCESS_NAMES = ["hog.exe", "quiet.exe", "picky.exe", "app.exe", "scheduled.exe", "streamer.exe"]


def make_policy(threshold_mb=500.0):
    from app.database import db

    # `db` is a process-wide singleton backed by the real sqlite file, so rule rows
    # from a previous test run would otherwise leak in (e.g. a process left "blocked").
    for name in ALL_TEST_PROCESS_NAMES:
        db.delete_rule(name)

    db.set_setting("auto_thresh", str(threshold_mb))
    firewall = FakeFirewall()
    throttle = FakeThrottle()
    rules = RuleStore()
    events = EventLogger()
    policy = BlockingPolicy(firewall, rules, events, throttle)
    return policy, firewall, rules, events, throttle


def test_evaluate_skips_under_threshold():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    usage = ProcessUsage(pid=1234, name="quiet.exe", bytes_sent=1024)

    policy.evaluate([usage])

    assert "quiet.exe" not in firewall.blocked


def test_evaluate_respects_per_process_limit():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    policy.set_limit("picky.exe", 1.0)
    usage = ProcessUsage(pid=1234, name="picky.exe", bytes_sent=2 * 1024 * 1024)

    policy.evaluate([usage])

    assert "picky.exe" in firewall.blocked


def test_unblock_clears_rule():
    policy, firewall, rules, events, throttle = make_policy()
    policy.block("app.exe", pid=None)
    assert rules.get("app.exe").blocked is True

    policy.unblock("app.exe")

    assert rules.get("app.exe").blocked is False
    assert "app.exe" in firewall.unblocked


def test_evaluate_skips_rule_outside_time_window():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    import datetime

    # A 1-minute window 12 hours from now, guaranteed not to contain the current time.
    far = datetime.datetime.now() + datetime.timedelta(hours=12)
    start = far.strftime("%H:%M")
    end = (far + datetime.timedelta(minutes=1)).strftime("%H:%M")

    rule = BlockRule(process_name="scheduled.exe", limit_mb=1.0, start_time=start, end_time=end)
    rules.set(rule)
    usage = ProcessUsage(pid=1234, name="scheduled.exe", bytes_sent=2 * 1024 * 1024)

    policy.evaluate([usage])

    assert "scheduled.exe" not in firewall.blocked


def test_evaluate_blocks_inside_time_window():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    import datetime

    now = datetime.datetime.now()
    start = (now - datetime.timedelta(minutes=5)).strftime("%H:%M")
    end = (now + datetime.timedelta(minutes=5)).strftime("%H:%M")

    rule = BlockRule(process_name="scheduled.exe", limit_mb=1.0, start_time=start, end_time=end)
    rules.set(rule)
    usage = ProcessUsage(pid=1234, name="scheduled.exe", bytes_sent=2 * 1024 * 1024)

    policy.evaluate([usage])

    assert "scheduled.exe" in firewall.blocked


def test_evaluate_skips_auto_threshold_when_network_limiting_disabled():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=10.0)
    usage = ProcessUsage(pid=1234, name="hog.exe", bytes_sent=20 * 1024 * 1024)

    policy.evaluate([usage], network_limiting_enabled=False)

    assert "hog.exe" not in firewall.blocked


def test_evaluate_still_enforces_explicit_limit_when_network_limiting_disabled():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    policy.set_limit("picky.exe", 1.0)
    usage = ProcessUsage(pid=1234, name="picky.exe", bytes_sent=2 * 1024 * 1024)

    policy.evaluate([usage], network_limiting_enabled=False)

    assert "picky.exe" in firewall.blocked


def test_evaluate_throttles_instead_of_blocking_when_throttle_configured():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    policy.set_rule("streamer.exe", limit_mb=1.0, start_time=None, end_time=None, category=None, throttle_kbps=100.0)
    usage = ProcessUsage(pid=1234, name="streamer.exe", bytes_sent=2 * 1024 * 1024)

    policy.evaluate([usage])

    assert ("streamer.exe", 100.0) in throttle.throttled
    assert "streamer.exe" not in firewall.blocked
    assert rules.get("streamer.exe").throttled is True
    assert events.read_all()[0]["action"] == "throttle"


def test_evaluate_does_not_rethrottle_already_throttled_process():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    policy.set_rule("streamer.exe", limit_mb=1.0, start_time=None, end_time=None, category=None, throttle_kbps=100.0)
    usage = ProcessUsage(pid=1234, name="streamer.exe", bytes_sent=2 * 1024 * 1024)

    policy.evaluate([usage])
    policy.evaluate([usage])

    assert len(throttle.throttled) == 1


def test_unthrottle_process_clears_throttled_flag():
    policy, firewall, rules, events, throttle = make_policy(threshold_mb=500.0)
    policy.set_rule("streamer.exe", limit_mb=1.0, start_time=None, end_time=None, category=None, throttle_kbps=100.0)
    usage = ProcessUsage(pid=1234, name="streamer.exe", bytes_sent=2 * 1024 * 1024)
    policy.evaluate([usage])
    assert rules.get("streamer.exe").throttled is True

    policy.unthrottle_process("streamer.exe")

    assert rules.get("streamer.exe").throttled is False
    assert "streamer.exe" in throttle.unthrottled
