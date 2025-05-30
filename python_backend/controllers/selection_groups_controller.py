# python_backend/controllers/selection_groups_controller.py
from __future__ import annotations
"""
Endpoints for saving / loading Selection Groups.
"""
import logging
from http import HTTPStatus
from flask import Blueprint, request
from pydantic import ValidationError

from services import selection_group_service as svc
from utils.response_utils import success_response, error_response
from models.request_models import SelectionGroupsSaveRequest  # NEW

logger = logging.getLogger(__name__)

selection_groups_blueprint = Blueprint(
    "selection_groups_blueprint",
    __name__,
    url_prefix="/api/selectionGroups",
)

# ───────────────────────────────── GET ─────────────────────────────
@selection_groups_blueprint.get("")
def list_selection_groups():
    project_path: str = (request.args.get("projectPath") or "").strip()
    if not project_path:
        return error_response("Missing 'projectPath' query parameter.", 400)

    try:
        groups = svc.load_groups(project_path)
        return success_response(data=groups)
    except Exception as exc:  # pragma: no cover
        logger.exception("Failed to load selection groups.")
        return error_response(str(exc), "Failed to load selection groups", 500)

# ───────────────────────────────── POST ────────────────────────────
@selection_groups_blueprint.post("")
def save_selection_groups():
    project_path: str = (request.args.get("projectPath") or "").strip()
    if not project_path:
        return error_response("Missing 'projectPath' query parameter.", 400)

    payload = request.get_json(silent=True) or {}
    try:
        req = SelectionGroupsSaveRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        svc.save_groups(project_path, req.groups)
        return success_response(message="Selection groups saved.")
    except Exception as exc:  # pragma: no cover
        logger.exception("Failed to save selection groups.")
        return error_response(str(exc), "Failed to save selection groups", 500)
