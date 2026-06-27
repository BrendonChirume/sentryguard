import locale
import re
import socket
import subprocess


def _decode_console_output(raw: bytes) -> str:
    """netsh's output encoding varies by system (UTF-8 on some, the OEM/ANSI
    codepage on others) — decoding with the wrong one mangles non-ASCII
    characters (e.g. a curly apostrophe in a device name) into mojibake."""
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode(locale.getpreferredencoding(False), errors="replace")


def _get_wifi_ssid() -> str | None:
    try:
        result = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    stdout = _decode_console_output(result.stdout)
    match = re.search(r"^\s*SSID\s*:\s*(.+)$", stdout, re.MULTILINE)
    ssid = match.group(1).strip() if match else None
    return ssid or None


def get_local_ip() -> str | None:
    """Cheap, silent check for the locally-bound IP — a UDP "connect" never
    actually sends a packet, it just does a routing-table lookup, so unlike
    netsh wlan it doesn't trigger Windows' Wi-Fi/location indicator. Used to
    detect *that* the network likely changed before paying for the more
    expensive (and indicator-triggering) SSID lookup."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def _get_local_subnet() -> str | None:
    ip = get_local_ip()
    if ip is None:
        return None
    parts = ip.split(".")
    if len(parts) != 4:
        return None
    return f"{'.'.join(parts[:3])}.0/24"


def get_current_network() -> tuple[str, str]:
    """Identifies whatever network is currently active.

    Returns (network_id, display_name). Wi-Fi networks are identified by SSID;
    wired/other connections fall back to the local /24 subnet, since Windows
    doesn't expose a stable wired network name the way it does an SSID.
    """
    ssid = _get_wifi_ssid()
    if ssid:
        return f"wifi:{ssid}", ssid

    subnet = _get_local_subnet()
    if subnet:
        return f"wired:{subnet}", f"Wired network ({subnet})"

    return "unknown", "Unknown network"
