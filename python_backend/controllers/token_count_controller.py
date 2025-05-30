# File: python_backend/controllers/token_count_controller.py
import logging
from flask import Blueprint, request
from pydantic import ValidationError

from services.project_service import ProjectService
from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from utils.response_utils import success_response, error_response
from models.request_models import TokenCountRequest  # NEW

logger = logging.getLogger(__name__)
token_blueprint = Blueprint("token_blueprint", __name__)

# ─── dependencies ───────────────────────────────────────────────────────────
_storage   = FileStorageRepository()
_exclude   = ExclusionService(storage_repo=_storage)
_project_s = ProjectService(storage_repo=_storage, exclusion_service=_exclude)
# ────────────────────────────────────────────────────────────────────────────


@token_blueprint.post("/api/tokenCount")
def get_token_count_endpoint():
    payload = request.get_json(silent=True) or {}
    try:
        req = TokenCountRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        token_count = _project_s.estimate_token_count(req.text)
        return success_response(data={"tokenCount": token_count})
    except Exception as exc:
        logger.exception("Error estimating token count")
        return error_response(str(exc), "Failed to estimate token count", 500)
