# FILE: python_backend/controllers/project_controller.py
from __future__ import annotations
"""
project_controller.py – endpoints for project tree and file‑content retrieval.
Only responsibilities that truly belong to the *project domain* are kept here.

**MODIFIED (vNext):** Pass `rootDir` to `get_project_tree` service method.
"""

import logging
import os # Import os
from flask import Blueprint, request, current_app # Import current_app

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

# ───── Dependency graph ------------------------------------------------------
# In a real app, use Flask extensions or a proper DI container
# For simplicity here, we instantiate directly.
_storage     = FileStorageRepository()
_exclusions  = ExclusionService(_storage)
_projects    = ProjectService(_storage, _exclusions)
# ---------------------------------------------------------------------------

project_bp = Blueprint("projects", __name__, url_prefix="/api")

# ─────────────────────────────────────────────────────────────────────────────
# 1.  Recursive tree
# ─────────────────────────────────────────────────────────────────────────────
@project_bp.get("/projects/tree")
def api_project_tree():
    """
    GET /api/projects/tree?rootDir=<dir>
    Returns a recursive directory tree starting at *rootDir* while honouring
    global and project-specific exclusions.
    """
    root_dir = (request.args.get("rootDir") or "").strip()
    if not root_dir:
        return error_response("'rootDir' query parameter is required.", 400)

    # Basic validation: check if path looks plausible (exists and is directory)
    # Service layer also validates, but good to have early check
    if not os.path.isdir(root_dir):
         return error_response(f"Project path '{root_dir}' not found or is not a directory.", status_code=404)

    try:
        # Pass root_dir to the service method which now expects it
        # for loading local exclusions.
        tree = _projects.get_project_tree(root_dir)
        return success_response(data=tree)
    except ValueError as e:
        # Catch specific errors like invalid root dir from service
        return error_response(str(e), 400)
    except PermissionError as e:
         logger.warning(f"Permission error accessing project tree for {root_dir}: {e}")
         return error_response(f"Permission denied accessing parts of '{root_dir}'.", 403)
    except Exception as e:                                 # pragma: no cover
        logger.exception(f"Unhandled error while building project tree for {root_dir}.")
        # Avoid leaking internal details in production
        error_message = str(e) if current_app.config.get("DEBUG") else "Internal server error"
        return error_response(error_message, 500)

# ─────────────────────────────────────────────────────────────────────────────
# 2.  File content + token counts
# ─────────────────────────────────────────────────────────────────────────────
@project_bp.post("/projects/files")
def api_project_files():
    """
    POST /api/projects/files
    Body → { "baseDir": "<absolute dir>", "paths": ["rel/one.ts", "rel/two.md"] }

    Returns → [
        { "path": "rel/one.ts", "content": "...", "tokenCount": 123 },
        …
    ]
    """
    payload   = request.get_json(silent=True) or {}
    base_dir  = (payload.get("baseDir") or "").strip()
    rel_paths = payload.get("paths", [])

    if not base_dir:
        return error_response("'baseDir' is required in body.", 400)
    # Basic validation for base_dir
    if not os.path.isdir(base_dir):
         return error_response(f"Base directory '{base_dir}' not found or is not a directory.", status_code=404)

    if not isinstance(rel_paths, list):
        return error_response("'paths' must be an array.", 400)
    # Validate paths are strings
    if not all(isinstance(p, str) for p in rel_paths):
         return error_response("All items in 'paths' must be strings.", 400)

    try:
        files = _projects.get_files_content(base_dir, rel_paths)
        return success_response(data=files)
    except ValueError as e:
        return error_response(str(e), 400)
    except PermissionError as e:
         logger.warning(f"Permission error reading files in {base_dir}: {e}")
         return error_response(f"Permission denied reading files in '{base_dir}'.", 403)
    except Exception as e:                                 # pragma: no cover
        logger.exception(f"Unhandled error while reading files for {base_dir}.")
        error_message = str(e) if current_app.config.get("DEBUG") else "Internal server error"
        return error_response(error_message, 500)