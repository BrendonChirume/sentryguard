import os
import sys


def _apply_data_dir_arg() -> None:
    # The backend now runs as an elevated Scheduled Task (see installer.nsh)
    # rather than as an Electron child process, so it no longer inherits
    # SENTRYGUARD_DATA_DIR from Electron's environment — the task action
    # passes it as a CLI arg instead. Must run before importing app.api,
    # since app.database reads the env var at import time.
    if "--data-dir" in sys.argv:
        idx = sys.argv.index("--data-dir")
        os.environ["SENTRYGUARD_DATA_DIR"] = sys.argv[idx + 1]


def main() -> None:
    _apply_data_dir_arg()
    import uvicorn
    from app.api import app as fastapi_app

    # Pass the app object directly rather than the "app.api:app" string form —
    # reload is off, and the string form requires a runtime import that
    # PyInstaller's static analysis can't see, breaking the frozen build.
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    main()
