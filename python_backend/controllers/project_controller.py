from __future__ import annotations
"""
project_controller.py – endpoints for project tree and file-content retrieval.
Only responsibilities that truly belong to the *project domain* are kept here.
"""

import logging
import os
from flask import Blueprint, request, current_app
from pydantic import ValidationError

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from utils.response_utils import success_response, error_response
from models.request_models import ProjectFilesRequest

logger = logging.getLogger(__name__)

# ─── dependencies ───────────────────────────────────────────────────────────
_storage     = FileStorageRepository()
_exclusions  = ExclusionService(_storage)
_projects    = ProjectService(_storage, _exclusions)
# ────────────────────────────────────────────────────────────────────────────

project_bp = Blueprint("projects", __name__, url_prefix="/api")

# ─────────────────────────── 1. Recursive tree ──────────────────────────────
@project_bp.get("/projects/tree")
def api_project_tree():
    root_dir = (request.args.get("rootDir") or "").strip()
    if not root_dir:
        return error_response("'rootDir' query parameter is required.", 400)
    if not os.path.isdir(root_dir):
        return error_response(f"Project path '{root_dir}' not found or is not a directory.", 404)

    try:
        tree = _projects.get_project_tree(root_dir)
        return success_response(data=tree)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except PermissionError as exc:
        logger.warning("Permission error accessing project tree for %s: %s", root_dir, exc)
        return error_response(f"Permission denied accessing parts of '{root_dir}'.", 403)
    except Exception as exc:                                  # pragma: no cover
        logger.exception("Unhandled error while building project tree for %s.", root_dir)
        err_msg = str(exc) if current_app.config.get("DEBUG") else "Internal server error"
        return error_response(err_msg, 500)

# ──────────────────────── 2. File content + tokens ──────────────────────────
@project_bp.post("/projects/files")
def api_project_files():
    """
    POST /api/projects/files
    Body → { "baseDir": "<absolute dir>", "paths": ["rel/one.ts", …] }
    """
    payload = request.get_json(silent=True) or {}
    try:
        req = ProjectFilesRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    if not os.path.isdir(req.baseDir):
        return error_response(
            f"Base directory '{req.baseDir}' not found or is not a directory.", 404
        )

    # ── NEW: drop directory entries ────────────────────────────────────────
    abs_base = os.path.abspath(req.baseDir)
    filtered_paths: list[str] = []
    for rel in req.paths:
        abs_path = os.path.abspath(os.path.join(abs_base, rel))
        # keep only regular files inside baseDir
        if abs_path.startswith(abs_base) and os.path.isfile(abs_path):
            filtered_paths.append(rel)
        else:
            logger.debug("Skipping non-file path in request: %s", rel)

    if not filtered_paths:
        return error_response("No valid file paths provided – only regular files are allowed.", 400)
    # ────────────────────────────────────────────────────────────────────────

    try:
        files = _projects.get_files_content(req.baseDir, filtered_paths)
        return success_response(data=files)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except PermissionError as exc:
        logger.warning("Permission error reading files in %s: %s", req.baseDir, exc)
        return error_response(f"Permission denied reading files in '{req.baseDir}'.", 403)
    except Exception as exc:                                  # pragma: no cover
        logger.exception("Unhandled error while reading files for %s.", req.baseDir)
        err_msg = str(exc) if current_app.config.get("DEBUG") else "Internal server error"
        return error_response(err_msg, 500)
