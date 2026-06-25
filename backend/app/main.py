import uvicorn

from app.api import app as fastapi_app


def main() -> None:
    # Pass the app object directly rather than the "app.api:app" string form —
    # reload is off, and the string form requires a runtime import that
    # PyInstaller's static analysis can't see, breaking the frozen build.
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    main()
