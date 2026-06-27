import logging
import socket
import threading
import time
from collections import defaultdict

import psutil
import pydivert

from app.models import ProcessUsage

PORT_MAP_REFRESH_SECONDS = 2.0

log = logging.getLogger(__name__)


class NetworkMonitor:
    """Captures live traffic via WinDivert and attributes bytes to processes.

    psutil has no per-pid byte counters on Windows, so we capture packets
    with pydivert and resolve each packet's local port to a pid using
    psutil's connection table (refreshed periodically, since walking it
    on every packet would be too slow).
    """

    def __init__(self, filter_str: str = "ip and (tcp or udp)"):
        self._filter_str = filter_str
        self._usage: dict[int, ProcessUsage] = {}
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._port_pid_map: dict[tuple[str, int], int] = {}
        self._port_map_updated_at = 0.0
        self._hostname_cache: dict[str, str | None] = {}

    def start(self) -> None:
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._thread.join(timeout=5)

    def snapshot(self) -> list[ProcessUsage]:
        with self._lock:
            return list(self._usage.values())

    def get_connections(self, process_name: str) -> list[dict]:
        self._refresh_port_map_if_stale()
        conns = []
        for conn in psutil.net_connections(kind="inet"):
            if conn.pid is None:
                continue
            try:
                name = psutil.Process(conn.pid).name()
            except psutil.NoSuchProcess:
                name = f"pid:{conn.pid}"
            
            if name == process_name:
                raddr_ip = conn.raddr.ip if conn.raddr else None
                conns.append({
                    "type": "TCP" if conn.type == 1 else "UDP",
                    "laddr": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                    "raddr": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                    "status": conn.status,
                    "hostname": self._resolve_hostname(raddr_ip) if raddr_ip else None,
                })
        return conns

    def _resolve_hostname(self, ip: str) -> str | None:
        if ip in self._hostname_cache:
            return self._hostname_cache[ip]
        try:
            hostname = socket.gethostbyaddr(ip)[0]
        except (socket.herror, socket.gaierror, OSError):
            hostname = None
        self._hostname_cache[ip] = hostname
        return hostname

    def reset(self) -> None:
        with self._lock:
            self._usage.clear()

    def _run(self) -> None:
        # WinDivert intercepts every matching packet system-wide and relies on us
        # calling w.send() to put each one back on the wire. If a packet handler
        # raises and we skip the send, or the whole capture loop dies, traffic
        # stops flowing system-wide until the handle is closed (e.g. by killing
        # the process) — that's the "no internet" failure this guards against.
        while not self._stop_event.is_set():
            try:
                with pydivert.WinDivert(self._filter_str) as w:
                    for packet in w:
                        if self._stop_event.is_set():
                            break
                        try:
                            self._handle_packet(packet)
                        except Exception:
                            log.exception("Error handling a captured packet; forwarding it unmodified")
                        finally:
                            try:
                                w.send(packet)
                            except Exception:
                                log.exception("Failed to re-send a captured packet")
            except Exception:
                if self._stop_event.is_set():
                    break
                log.exception("WinDivert capture loop crashed; restarting in 1s")
                time.sleep(1)

    def _handle_packet(self, packet: pydivert.Packet) -> None:
        self._refresh_port_map_if_stale()

        proto = "tcp" if packet.tcp else "udp" if packet.udp else None
        if proto is None:
            return

        local_port = packet.src_port if packet.is_outbound else packet.dst_port
        pid = self._port_pid_map.get((proto, local_port))
        if pid is None:
            return

        size = len(packet.raw.tobytes())

        with self._lock:
            usage = self._usage.get(pid)
            if usage is None:
                try:
                    name = psutil.Process(pid).name()
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.Error):
                    name = f"pid:{pid}"
                usage = ProcessUsage(pid=pid, name=name)
                self._usage[pid] = usage

            if packet.is_outbound:
                usage.bytes_sent += size
            else:
                usage.bytes_recv += size

    def _refresh_port_map_if_stale(self) -> None:
        now = time.monotonic()
        if now - self._port_map_updated_at < PORT_MAP_REFRESH_SECONDS:
            return

        new_map: dict[tuple[str, int], int] = {}
        try:
            connections = psutil.net_connections(kind="inet")
        except (psutil.AccessDenied, psutil.Error):
            log.exception("Failed to list connections for the port map; keeping the previous map")
            return

        for conn in connections:
            if conn.pid is None or not conn.laddr:
                continue
            proto = "tcp" if conn.type == 1 else "udp"
            new_map[(proto, conn.laddr.port)] = conn.pid

        self._port_pid_map = new_map
        self._port_map_updated_at = now
