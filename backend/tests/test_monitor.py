from types import SimpleNamespace

from app.monitor import NetworkMonitor


class FakePacket:
    def __init__(self, *, tcp=True, udp=False, src_port=0, dst_port=0, is_outbound=True, payload=b"x" * 100):
        self.tcp = tcp
        self.udp = udp
        self.src_port = src_port
        self.dst_port = dst_port
        self.is_outbound = is_outbound
        self.raw = memoryview(payload)


def test_handle_packet_attributes_outbound_bytes(monkeypatch):
    monitor = NetworkMonitor()
    monitor._port_pid_map = {("tcp", 5000): 42}

    monkeypatch.setattr(
        "app.monitor.psutil.Process",
        lambda pid: SimpleNamespace(name=lambda: "myapp.exe"),
    )

    packet = FakePacket(src_port=5000, is_outbound=True, payload=b"x" * 250)
    monitor._handle_packet(packet)

    usages = {u.pid: u for u in monitor.snapshot()}
    assert usages[42].name == "myapp.exe"
    assert usages[42].bytes_sent == 250
    assert usages[42].bytes_recv == 0


def test_handle_packet_attributes_inbound_bytes(monkeypatch):
    monitor = NetworkMonitor()
    monitor._port_pid_map = {("udp", 6000): 7}

    monkeypatch.setattr(
        "app.monitor.psutil.Process",
        lambda pid: SimpleNamespace(name=lambda: "other.exe"),
    )

    packet = FakePacket(tcp=False, udp=True, dst_port=6000, is_outbound=False, payload=b"y" * 80)
    monitor._handle_packet(packet)

    usages = {u.pid: u for u in monitor.snapshot()}
    assert usages[7].bytes_recv == 80
    assert usages[7].bytes_sent == 0


def test_handle_packet_unknown_port_is_ignored():
    monitor = NetworkMonitor()
    monitor._port_pid_map = {}

    packet = FakePacket(src_port=9999, is_outbound=True)
    monitor._handle_packet(packet)

    assert monitor.snapshot() == []
