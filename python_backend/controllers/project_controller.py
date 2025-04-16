from __future__ import annotations
"""
project_controller.py – endpoints for project tree and file‑content retrieval.
Only responsibilities that truly belong to the *project domain* are kept here.
"""

import logging
from flask import Blueprint, request

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

# ───── Dependency graph ------------------------------------------------------
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
    global exclusions (ignoreDirs.txt).
    """
    root_dir = (request.args.get("rootDir") or "").strip()
    if not root_dir:
        return error_response("'rootDir' query parameter is required.", 400)

    try:
        tree = _projects.get_project_tree(root_dir)
        return success_response(data=tree)
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:                                 # pragma: no cover
        logger.exception("Unhandled error while building project tree.")
        return error_response(str(e), 500)

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
    if not isinstance(rel_paths, list):
        return error_response("'paths' must be an array.", 400)

    try:
        files = _projects.get_files_content(base_dir, rel_paths)
        return success_response(data=files)
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:                                 # pragma: no cover
        logger.exception("Unhandled error while reading files.")
        return error_response(str(e), 500)
