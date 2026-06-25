import subprocess

import pytest

from app.firewall import FirewallError, FirewallManager


def fake_runner(returncode, stdout="", stderr=""):
    def runner(args, capture_output=True, text=True):
        return subprocess.CompletedProcess(args, returncode, stdout=stdout, stderr=stderr)
    return runner


def test_block_success():
    fw = FirewallManager(runner=fake_runner(0))
    fw.block("C:\\app.exe", "app.exe")


def test_block_failure_raises():
    fw = FirewallManager(runner=fake_runner(1, stderr="access denied"))
    with pytest.raises(FirewallError, match="access denied"):
        fw.block("C:\\app.exe", "app.exe")


def test_unblock_success():
    fw = FirewallManager(runner=fake_runner(0))
    fw.unblock("app.exe")


def test_is_blocked_true():
    fw = FirewallManager(runner=fake_runner(0, stdout="Rule Name: SentryGuard_Block_app.exe"))
    assert fw.is_blocked("app.exe") is True


def test_is_blocked_false_when_not_found():
    fw = FirewallManager(runner=fake_runner(1, stderr="No rules match"))
    assert fw.is_blocked("app.exe") is False
