import re
import socket
import subprocess


def _get_wifi_ssid() -> str | None:
    try:
        result = subprocess.run(
            ["netsh", "wlan", "show", "interfaces"],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    match = re.search(r"^\s*SSID\s*:\s*(.+)$", result.stdout, re.MULTILINE)
    ssid = match.group(1).strip() if match else None
    return ssid or None


def _get_local_subnet() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
    except OSError:
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
