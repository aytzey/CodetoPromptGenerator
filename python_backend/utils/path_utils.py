"""
utils/path_utils.py
--------------------------------------------------
Cross‑platform helpers for safe path introspection.

Why a separate module?
──────────────────────
* Keeps controllers thin (SRP).
* Central place for OS quirks (Open/Closed principle).
"""

from __future__ import annotations

import os
import pathlib
from typing import List, Dict


def list_logical_drives() -> List[Dict[str, str]]:
    """
    Return a list of dictionaries → [{ name, path }, …]

    * Linux & macOS → root (/) + user‐home + /media mounts
    * Windows      → every drive letter  (C:\\, D:\\  …)
    """
    drives: List[Dict[str, str]] = []

    if os.name == "nt":  # Windows
        import string
        import ctypes  # pylint: disable=import-error

        bitmask = ctypes.windll.kernel32.GetLogicalDrives()
        for i, letter in enumerate(string.ascii_uppercase):
            if bitmask & (1 << i):
                path = f"{letter}:\\"
                drives.append({"name": letter, "path": path})
        return drives

    # --- *nix ---
    drives.append({"name": "Root", "path": "/"})

    home_dir = pathlib.Path.home()
    drives.append({"name": "Home", "path": str(home_dir)})

    media_dir = pathlib.Path("/media")
    if media_dir.exists():
        for entry in media_dir.iterdir():
            if entry.is_dir():
                drives.append({"name": entry.name, "path": str(entry)})

    return drives


def list_subfolders(path: str) -> List[Dict[str, str]]:
    """
    Return immediate child directories of *path* that the current
    process can stat() & read.
    """
    folders: List[Dict[str, str]] = []
    try:
        p = pathlib.Path(path).expanduser().resolve()
        if not p.is_dir():
            raise NotADirectoryError(f"{p} is not a directory")

        for child in p.iterdir():
            if child.is_dir():
                folders.append({"name": child.name, "path": str(child)})
    except PermissionError:
        # Bubble up so controller can return 403
        raise
    return sorted(folders, key=lambda f: f["name"].lower())
