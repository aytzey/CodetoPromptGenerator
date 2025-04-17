# python_backend/controllers/codemap_controller.py
# ────────────────────────────────────────────────────────────────────────────
"""
Codemap Extraction Endpoints
────────────────────────────
POST /api/codemap/extract

Request Body
------------
{
  "baseDir": "/absolute/project/root",
  "paths":   ["src/main.py", "lib/utils.ts"]
}

Success Response
----------------
{
  "success": true,
  "data": {
    "src/main.py": {
      "classes": ["MyClass"],
      "functions": ["foo", "bar"],
      "references": ["ExternalType"]
    },
    "lib/utils.ts": { ... }
  }
}
"""

from __future__ import annotations

import logging
from flask import Blueprint, request

from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

# ───── Dependencies ─────────────────────────────────────────────────────────
_storage      = FileStorageRepository()
_codemap_svc  = CodemapService(storage_repo=_storage)
# ────────────────────────────────────────────────────────────────────────────

codemap_bp = Blueprint("codemap_bp", __name__, url_prefix="/api/codemap")


@codemap_bp.post("/extract")
def extract_codemap():
    """
    POST /api/codemap/extract
    Body → { "baseDir": "<abs dir>", "paths": ["rel/one.py", …] }
    """
    payload   = request.get_json(silent=True) or {}
    base_dir  = (payload.get("baseDir") or "").strip()
    rel_paths = payload.get("paths", [])

    if not base_dir:
        return error_response("'baseDir' is required in body.", 400)
    if not isinstance(rel_paths, list):
        return error_response("'paths' must be an array.", 400)

    try:
        codemap = _codemap_svc.extract_codemap(base_dir, rel_paths)
        return success_response(data=codemap)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error during codemap extraction.")
        return error_response(str(exc), 500)
