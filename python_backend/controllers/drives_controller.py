"""
drives_controller.py
————————————————————————————————————————————————————————
Lists *top‑level* drives / mount points.

⚠️  Path changed from `/api/select_drives` → **`/api/drives`**
    to avoid duplicating the route already exposed by the folder‑browser
    blueprint.  Front‑end calls aimed at `/api/select_drives` continue to
    work via `resolve_folder_controller.py`.
"""
from __future__ import annotations

import platform
import string
import ctypes
from pathlib import Path

from flask import Blueprint, jsonify

drives_bp = Blueprint("drives_bp", __name__)  # auto‑registered

# ---------------------------------------------------------------------------

@drives_bp.get("/api/drives")
def list_drives():
    """
    GET /api/drives
    Returns a de‑duplicated list of logical drives or well‑known roots.
    """
    drives: list[dict[str, str]] = []
    system = platform.system().lower()

    if system == "windows":
        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for i, letter in enumerate(string.ascii_uppercase):
            if bitmask & (1 << i):
                drives.append({"name": f"{letter}:\\", "path": f"{letter}:\\"})
    else:
        drives.append({"name": "Root", "path": "/"})
        home = Path.home()
        drives.append({"name": "Home", "path": str(home)})

        for parent in (Path("/mnt"), Path("/media")):
            if parent.is_dir():
                for p in parent.iterdir():
                    if p.is_dir():
                        drives.append({"name": p.name, "path": str(p)})

    # de‑duplicate while preserving order
    seen: set[str] = set()
    uniq = [d for d in drives if not (d["path"] in seen or seen.add(d["path"]))]
    return jsonify(success=True, drives=uniq)
