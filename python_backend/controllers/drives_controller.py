# python_backend/controllers/drives_controller.py
"""
Cross‑platform endpoint that lists top‑level ‘drives’ for the folder picker.

• Windows  – traditional C:\, D:\ … (using Win32 API)
• POSIX    – always returns "/" (root) and the current user's HOME.
             It also adds first‑level mount points under /mnt and /media
             if those directories exist.

Response shape
==============
{
    "success": true,
    "drives": [
        {"name": "Root", "path": "/"},
        {"name": "Home", "path": "/home/aytzey"},
        …                                         # platform specific
    ]
}
"""

from __future__ import annotations

import os
import platform
import string
import ctypes
from pathlib import Path

from flask import Blueprint, jsonify

drives_bp = Blueprint("drives_bp", __name__)  # registered in app.py


@drives_bp.route("/api/select_drives", methods=["GET"])
def select_drives():
    drives: list[dict[str, str]] = []
    system = platform.system().lower()

    if system == "windows":
        # Use Win32 API to enumerate logical drives
        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for i, letter in enumerate(string.ascii_uppercase):
            if bitmask & (1 << i):
                drives.append(
                    {
                        "name": f"{letter}:\\",
                        "path": f"{letter}:\\",
                    }
                )
    else:
        # ── POSIX (Linux / macOS) ────────────────────────────────────────
        # ① Root
        drives.append({"name": "Root", "path": "/"})

        # ② Current user's HOME
        home_path = Path.home()
        drives.append({"name": "Home", "path": str(home_path)})

        # ③ First‑level mount points under /mnt and /media
        for mount_parent in (Path("/mnt"), Path("/media")):
            if mount_parent.is_dir():
                for entry in mount_parent.iterdir():
                    if entry.is_dir():
                        drives.append({"name": entry.name, "path": str(entry)})

    return jsonify(success=True, drives=drives)
