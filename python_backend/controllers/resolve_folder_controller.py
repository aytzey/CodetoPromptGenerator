"""
resolve_folder_controller.py
————————————————————————————————————————————————————————
All helper endpoints that power the *folder‑picker* UI component.
"""

from __future__ import annotations

import logging
from http import HTTPStatus
from pathlib import Path

from flask import Blueprint, jsonify, request, abort

from utils.path_utils import list_logical_drives, list_subfolders
from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService

logger = logging.getLogger(__name__)

resolve_bp = Blueprint("resolve", __name__, url_prefix="/api")

# ─── dependencies -----------------------------------------------------------
_storage    = FileStorageRepository()
_exclusions = ExclusionService(_storage)
_projects   = ProjectService(_storage, _exclusions)
# ---------------------------------------------------------------------------

# ───────────────────────── 1. drives (kept for legacy) ──────────────────────
@resolve_bp.get("/select_drives")
def api_select_drives():
    """Legacy endpoint – kept because the front‑end expects it."""
    return jsonify(success=True, drives=list_logical_drives())

# ───────────────────────── 2. browse sub‑folders ────────────────────────────
@resolve_bp.get("/browse_folders")
def api_browse_folders():
    raw_path: str | None = request.args.get("path")
    if not raw_path:
        abort(HTTPStatus.BAD_REQUEST, "Missing 'path' query‑param")

    try:
        path = Path(raw_path).expanduser().resolve(strict=True)
    except (FileNotFoundError, RuntimeError):
        return jsonify(success=False, error="Path does not exist."), HTTPStatus.NOT_FOUND

    if not path.is_dir():
        return jsonify(success=False, error="Path is not a directory."), HTTPStatus.BAD_REQUEST

    try:
        folders = list_subfolders(str(path))
    except PermissionError:
        return jsonify(success=False, error="Permission denied."), HTTPStatus.FORBIDDEN

    parent = None if path.parent == path else str(path.parent)
    return jsonify(
        success=True,
        current_path=str(path),
        parent_path=parent,
        folders=folders,
    )

# ───────────────────────── 3. resolveFolder (NEW) ───────────────────────────
@resolve_bp.post("/resolveFolder")
def api_resolve_folder():
    """
    POST /api/resolveFolder
    Body → { "folderName": "<relative or absolute path>" }
    Returns → { success: true, resolvedPath: "<absolute/path>" }
    """
    payload     = request.get_json(silent=True) or {}
    folder_name = (payload.get("folderName") or "").strip()

    if not folder_name:
        abort(HTTPStatus.BAD_REQUEST, "Missing 'folderName' in body.")

    try:
        resolved = _projects.resolve_folder_path(folder_name)
        return jsonify(success=True, resolvedPath=resolved)
    except ValueError as e:
        return jsonify(success=False, error=str(e)), HTTPStatus.BAD_REQUEST
    except Exception as e:
        logger.exception("Error while resolving folder path.")
        return jsonify(success=False, error=str(e)), HTTPStatus.INTERNAL_SERVER_ERROR
