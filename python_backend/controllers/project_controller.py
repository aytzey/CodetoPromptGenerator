# FILE: python_backend/controllers/project_controller.py
# UPDATED: catches shared service_exceptions

from __future__ import annotations

import logging
import os
from flask import Blueprint, request, current_app
from pydantic import ValidationError

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.project_service import ProjectService
from services.service_exceptions import (        # ← NEW
    InvalidInputError,
    ResourceNotFoundError,
    PermissionDeniedError,
)
from utils.response_utils import success_response, error_response
from models.request_models import ProjectFilesRequest

logger = logging.getLogger(__name__)

_storage     = FileStorageRepository()
_exclusions  = ExclusionService(_storage)
_projects    = ProjectService(_storage, _exclusions)

project_bp = Blueprint("projects", __name__, url_prefix="/api")

# ─────────────────────────── 1. Recursive tree ──────────────────────────────
@project_bp.get("/projects/tree")
def api_project_tree():
    root_dir = (request.args.get("rootDir") or "").strip()
    try:
        tree = _projects.get_project_tree(root_dir)
        return success_response(data=tree)
    except InvalidInputError as exc:
        return error_response(str(exc), 400)
    except ResourceNotFoundError as exc:
        return error_response(str(exc), 404)
    except PermissionDeniedError as exc:
        return error_response(str(exc), 403)
    except Exception as exc:                                  # pragma: no cover
        logger.exception("Unhandled error while building project tree")
        err_msg = str(exc) if current_app.config.get("DEBUG") else "Internal server error"
        return error_response(err_msg, 500)

# ──────────────────────── 2. File content + tokens ──────────────────────────
@project_bp.post("/projects/files")
def api_project_files():
    payload = request.get_json(silent=True) or {}
    try:
        req = ProjectFilesRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        files = _projects.get_files_content(req.baseDir, req.paths)
        return success_response(data=files)
    except InvalidInputError as exc:
        return error_response(str(exc), 400)
    except ResourceNotFoundError as exc:
        return error_response(str(exc), 404)
    except PermissionDeniedError as exc:
        return error_response(str(exc), 403)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error while reading files")
        err_msg = str(exc) if current_app.config.get("DEBUG") else "Internal server error"
        return error_response(err_msg, 500)
