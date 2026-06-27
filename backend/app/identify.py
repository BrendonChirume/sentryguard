import logging
import subprocess

log = logging.getLogger(__name__)

_description_cache: dict[str, str | None] = {}


def get_app_description(process_path: str) -> str | None:
    """Resolves a human-friendly app name from an exe's embedded version info
    (e.g. "streamer.exe" -> "OBS Studio"), so process names that mean nothing
    to a normal user show something recognizable. Falls back to None (caller
    should just display the raw process name) when there's no useful metadata
    or the lookup fails — this must never block startup or polling."""
    if process_path in _description_cache:
        return _description_cache[process_path]

    description = _query_file_description(process_path)
    _description_cache[process_path] = description
    return description


def _query_file_description(process_path: str) -> str | None:
    if not process_path or "\\" not in process_path:
        return None
    escaped_path = process_path.replace("'", "''")
    try:
        result = subprocess.run(
            [
                "powershell", "-NoProfile", "-NonInteractive", "-Command",
                f"(Get-Item -LiteralPath '{escaped_path}').VersionInfo.FileDescription",
            ],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    description = result.stdout.strip()
    return description or None
