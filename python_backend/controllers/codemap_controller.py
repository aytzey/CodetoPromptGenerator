from __future__ import annotations
"""
Codemap Extraction Endpoints
────────────────────────────
POST /api/codemap/extract
"""
import logging
from flask import Blueprint, request
from pydantic import ValidationError

from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService
from utils.response_utils import success_response, error_response
from models.request_models import CodemapExtractRequest  # NEW

logger = logging.getLogger(__name__)

# ─── dependencies ───────────────────────────────────────────────────────────
_storage     = FileStorageRepository()
_codemap_svc = CodemapService(storage_repo=_storage)
# ────────────────────────────────────────────────────────────────────────────

codemap_bp = Blueprint("codemap_bp", __name__, url_prefix="/api/codemap")


@codemap_bp.post("/extract")
def extract_codemap():
    payload = request.get_json(silent=True) or {}
    try:
        req = CodemapExtractRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        codemap = _codemap_svc.extract_codemap(req.baseDir, req.paths)
        return success_response(data=codemap)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error during codemap extraction.")
        return error_response(str(exc), 500)
