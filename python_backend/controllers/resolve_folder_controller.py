# python_backend/controllers/resolve_folder_controller.py
from __future__ import annotations
"""
Helper endpoints that power the folder-picker UI component.
"""
import logging
from http import HTTPStatus
from pathlib import Path
from typing import Optional

from flask import Blueprint, jsonify, request, abort
from pydantic import ValidationError

from utils.path_utils import list_logical_drives, list_subfolders
from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from utils.response_utils import error_response
from models.request_models import ResolveFolderRequest  # NEW

logger = logging.getLogger(__name__)

resolve_bp = Blueprint("resolve", __name__, url_prefix="/api")

# ─── dependencies ───────────────────────────────────────────────────────────
_storage    = FileStorageRepository()
_exclusions = ExclusionService(_storage)
_projects   = ProjectService(_storage, _exclusions)
# ────────────────────────────────────────────────────────────────────────────


@resolve_bp.get("/select_drives")
def api_select_drives():
    """Legacy endpoint – kept because the front-end expects it."""
    return jsonify(success=True, drives=list_logical_drives())


@resolve_bp.get("/browse_folders")
def api_browse_folders():
    raw_path: Optional[str] = request.args.get("path")
    if not raw_path:
        abort(HTTPStatus.BAD_REQUEST, "Missing 'path' query-param")

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


@resolve_bp.post("/resolveFolder")
def api_resolve_folder():
    payload = request.get_json(silent=True) or {}
    try:
        req = ResolveFolderRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        resolved = _projects.resolve_folder_path(req.folderName)
        return jsonify(success=True, resolvedPath=resolved)
    except ValueError as exc:
        return jsonify(success=False, error=str(exc)), HTTPStatus.BAD_REQUEST
    except Exception as exc:
        logger.exception("Error while resolving folder path.")
        return jsonify(success=False, error=str(exc)), HTTPStatus.INTERNAL_SERVER_ERROR
