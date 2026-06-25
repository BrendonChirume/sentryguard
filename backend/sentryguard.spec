# Build with: pyinstaller sentryguard.spec
# Produces a one-folder build at dist/sentryguard-backend/ containing
# sentryguard-backend.exe plus its dependencies (including the WinDivert
# driver files pydivert needs at its expected relative path).
import os

import pydivert

block_cipher = None

pydivert_dll_dir = os.path.join(os.path.dirname(pydivert.__file__), "windivert_dll")
windivert_binaries = [
    (os.path.join(pydivert_dll_dir, name), "pydivert/windivert_dll")
    for name in ("WinDivert64.dll", "WinDivert64.sys")
    if os.path.exists(os.path.join(pydivert_dll_dir, name))
]

a = Analysis(
    ["app/main.py"],
    pathex=["."],
    binaries=windivert_binaries,
    datas=[],
    hiddenimports=["uvicorn.logging", "uvicorn.loops.auto", "uvicorn.protocols.http.auto", "uvicorn.lifespan.on"],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="sentryguard-backend",
    debug=False,
    strip=False,
    upx=False,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="sentryguard-backend",
)
