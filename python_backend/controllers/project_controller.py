from __future__ import annotations
"""
project_controller.py – safe folder‑browser + project tree endpoint.
"""

import logging
import string
from pathlib import Path
from typing import List

from flask import Blueprint, jsonify, request

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from utils.response_utils import success_response   #  ←–– added

logger = logging.getLogger(__name__)

# ───── Service / Repository singletons ───────────────────────────────────────
_storage = FileStorageRepository()
_exclusions = ExclusionService(_storage)
_projects = ProjectService(_storage, _exclusions)

# ───── Helpers ───────────────────────────────────────────────────────────────
def _list_subdirs(path: Path) -> List[dict]:
    return sorted(
        (
            {"name": p.name, "path": str(p)}
            for p in path.iterdir()
            if p.is_dir() and not p.name.startswith(".")
        ),
        key=lambda d: d["name"].lower(),
    )


def _allowed_roots() -> list[Path]:
    home = Path.home().resolve()
    roots = {Path("/").resolve(), home}

    media_root = Path("/media") / home.name
    if media_root.exists():
        roots.add(media_root.resolve())

    volumes = Path("/Volumes")
    if volumes.exists():
        roots.add(volumes.resolve())

    return list(roots)


def _is_path_allowed(target: Path) -> bool:
    if target.drive:          # Windows
        return True
    target = target.resolve()
    return any(target == r or target.is_relative_to(r) for r in _allowed_roots())


# ───── Blueprint ─────────────────────────────────────────────────────────────
project_bp = Blueprint("projects", __name__, url_prefix="/api")

# -- 1. logical drives --------------------------------------------------------
@project_bp.get("/select_drives")
def select_drives():
    user_home = Path.home()
    drives = [
        {"name": "Root", "path": "/"},
        {"name": "Home", "path": str(user_home)},
    ]

    root_home = Path("/root")
    if root_home.exists() and root_home != user_home:
        drives.append({"name": "root", "path": str(root_home)})

    media_root = Path("/media") / user_home.name
    if media_root.exists():
        drives.extend(
            {"name": m.name, "path": str(m)} for m in media_root.iterdir() if m.is_dir()
        )

    mac_volumes = Path("/Volumes")
    if mac_volumes.exists():
        drives.extend(
            {"name": v.name, "path": str(v)} for v in mac_volumes.iterdir() if v.is_dir()
        )

    if Path("/").anchor == "\\":                      # Windows
        from ctypes import windll                     # type: ignore
        bitmask = windll.kernel32.GetLogicalDrives()  # noqa: S110
        for letter in string.ascii_uppercase:
            if bitmask & 1:
                drives.append({"name": f"{letter}:\\", "path": f"{letter}:\\"})
            bitmask >>= 1

    # de‑duplicate
    seen: set[str] = set()
    drives = [d for d in drives if not (d["path"] in seen or seen.add(d["path"]))]

    return jsonify({"success": True, "drives": drives}), 200


# -- 2. list sub‑folders ------------------------------------------------------
@project_bp.get("/browse_folders")
def browse_folders():
    raw = (request.args.get("path") or "").strip()
    if not raw:
        return jsonify({"success": False, "error": "Query parameter 'path' is required."}), 400

    try:
        path = Path(raw).expanduser().resolve(strict=True)
    except (FileNotFoundError, RuntimeError):
        return jsonify({"success": False, "error": "Path does not exist."}), 404

    if not path.is_dir():
        return jsonify({"success": False, "error": "Path is not a directory."}), 400
    if not _is_path_allowed(path):
        return jsonify({"success": False, "error": "Access denied."}), 403

    try:
        folders = _list_subdirs(path)
    except PermissionError:
        return jsonify({"success": False, "error": "Permission denied."}), 403

    parent = None if path.parent == path else str(path.parent)
    return (
        jsonify(
            {
                "success": True,
                "current_path": str(path),
                "parent_path": parent,
                "folders": folders,
            }
        ),
        200,
    )


# -- 3. **FIXED** project tree endpoint --------------------------------------
@project_bp.route("/projects/tree", methods=["GET", "OPTIONS"])
def project_tree():
    """
    Returns the file‑tree for the requested rootDir.

    Success → { success: true, data: [ …tree… ] }
    """
    root_dir = (request.args.get("rootDir") or "").strip()
    if not root_dir:
        return jsonify({"success": False, "error": "Query parameter 'rootDir' is required."}), 400

    try:
        tree = _projects.get_project_tree(root_dir)
        # ★ return in the standard envelope so the React hook recognises it
        return success_response(data=tree)            # ←–– changed
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception:                                 # pragma: no cover
        logger.exception("Error while building project tree")
        return jsonify({"success": False, "error": "Internal server error."}), 500
