from __future__ import annotations
"""
controllers/project_controller.py
PATCH ‑ 2025‑04‑18
• Gracefully handles the rare case where the live ProjectService
  instance is missing the new `get_files_content` method (old version
  in memory after a hot reload).
• Normalises incoming relative paths so lookups succeed on any OS.
"""

# ... existing imports ...
import logging
import os
from typing import List

from flask import Blueprint, request

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

_storage    = FileStorageRepository()
_exclusions = ExclusionService(_storage)
_projects   = ProjectService(_storage, _exclusions)

project_bp = Blueprint("projects", __name__, url_prefix="/api")

# --------------------------------------------------------------------------- #
# GET /api/projects/tree (unchanged)                                          #
# --------------------------------------------------------------------------- #

# ... api_project_tree() stays the same ...

# --------------------------------------------------------------------------- #
# POST /api/projects/files                                                    #
# --------------------------------------------------------------------------- #
@project_bp.post("/projects/files")
def api_project_files():
    payload   = request.get_json(silent=True) or {}
    base_dir  = (payload.get("baseDir") or "").strip()
    raw_paths = payload.get("paths", [])

    if not base_dir:
        return error_response("'baseDir' is required in body.", 400)
    if not isinstance(raw_paths, list):
        return error_response("'paths' must be an array.", 400)

    # Normalise path separators and remove leading “./” or “/”.
    rel_paths: List[str] = [
        p.replace("\\", "/").lstrip("/").lstrip("./") for p in raw_paths
    ]

    try:
        # Defensive: some test runners may have imported an older
        # ProjectService before the patch‑reload; fall back transparently.
        if not hasattr(_projects, "get_files_content"):
            logger.warning(
                "ProjectService instance missing 'get_files_content'. "
                "Attempting class‑level fallback."
            )
            if hasattr(ProjectService, "get_files_content"):
                files = ProjectService.get_files_content(
                    _projects, base_dir, rel_paths
                )
            else:
                return error_response(
                    "Server mis‑configuration: ProjectService without "
                    "'get_files_content'.", 500
                )
        else:
            files = _projects.get_files_content(base_dir, rel_paths)

        return success_response(data=files)

    except ValueError as err:
        return error_response(str(err), 400)
    except Exception as err:   # pragma: no cover
        logger.exception("Unhandled error while reading files.")
        return error_response(str(err), 500)
