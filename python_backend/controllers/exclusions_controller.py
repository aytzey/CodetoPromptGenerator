# python_backend/controllers/exclusions_controller.py
import logging
import os
from flask import Blueprint, request
from pydantic import ValidationError

from services.exclusion_service import ExclusionService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
from models.request_models import GlobalExclusionsRequest, LocalExclusionsRequest  # NEW

logger = logging.getLogger(__name__)
exclusions_blueprint = Blueprint("exclusions_blueprint", __name__)

# ─── dependencies ───────────────────────────────────────────────────────────
_storage = FileStorageRepository()
_exclude = ExclusionService(storage_repo=_storage)
# ────────────────────────────────────────────────────────────────────────────


@exclusions_blueprint.route("/api/exclusions", methods=["GET", "POST"])
def handle_global_exclusions():
    if request.method == "GET":
        try:
            exclusions = _exclude.get_global_exclusions()
            return success_response(data=exclusions)
        except Exception as exc:
            logger.exception("Error getting global exclusions")
            return error_response(str(exc), "Failed to retrieve global exclusions", 500)

    # ---------- POST ----------
    payload = request.get_json(silent=True) or {}
    try:
        req = GlobalExclusionsRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        updated = _exclude.update_global_exclusions(req.exclusions)
        return success_response(data=updated, message="Global exclusions updated.")
    except ValueError as exc:
        return error_response(str(exc), 400)
    except IOError as exc:
        logger.error("IOError updating global exclusions: %s", exc)
        return error_response(str(exc), "Failed to write global exclusions file", 500)
    except Exception as exc:
        logger.exception("Error updating global exclusions")
        return error_response(str(exc), "Failed to update global exclusions", 500)


@exclusions_blueprint.route("/api/localExclusions", methods=["GET", "POST"])
def handle_local_exclusions():
    project_path = request.args.get("projectPath")
    if not project_path:
        return error_response("Missing 'projectPath' query parameter.", 400)
    if not os.path.isdir(project_path):
        return error_response(f"Project path '{project_path}' not found or is not a directory.", 404)

    if request.method == "GET":
        try:
            exclusions = _exclude.get_local_exclusions(project_path)
            return success_response(data=exclusions)
        except ValueError as exc:
            return error_response(str(exc), 400)
        except Exception as exc:
            logger.exception("Error getting local exclusions for %s", project_path)
            return error_response(str(exc), "Failed to retrieve local exclusions", 500)

    # ---------- POST ----------
    payload = request.get_json(silent=True) or {}
    try:
        req = LocalExclusionsRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        updated = _exclude.update_local_exclusions(project_path, req.localExclusions)
        return success_response(data=updated, message="Local exclusions updated.")
    except ValueError as exc:
        return error_response(str(exc), 400)
    except IOError as exc:
        logger.error("IOError updating local exclusions for %s: %s", project_path, exc)
        return error_response(str(exc), "Failed to write local exclusions file", 500)
    except Exception as exc:
        logger.exception("Error updating local exclusions for %s", project_path)
        return error_response(str(exc), "Failed to update local exclusions", 500)
