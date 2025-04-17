# python_backend/controllers/selection_groups_controller.py
"""
Endpoints for saving / loading *Selection Groups*.

    • GET  /api/selectionGroups?projectPath=<dir>
    • POST /api/selectionGroups?projectPath=<dir>   { "groups": { … } }
"""

from __future__ import annotations

import logging
from http import HTTPStatus

from flask import Blueprint, request
from services import selection_group_service as svc
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

selection_groups_blueprint = Blueprint(
    "selection_groups_blueprint",
    __name__,
    url_prefix="/api/selectionGroups",
)


@selection_groups_blueprint.route("", methods=["GET"])
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


@selection_groups_blueprint.route("", methods=["POST"])
def save_selection_groups():
    project_path: str = (request.args.get("projectPath") or "").strip()
    if not project_path:
        return error_response("Missing 'projectPath' query parameter.", 400)

    payload = request.get_json(silent=True) or {}
    groups = payload.get("groups")
    if not isinstance(groups, dict):
        return error_response("'groups' must be an object.", 400)

    try:
        svc.save_groups(project_path, groups)
        return success_response(message="Selection groups saved.")
    except Exception as exc:  # pragma: no cover
        logger.exception("Failed to save selection groups.")
        return error_response(str(exc), "Failed to save selection groups", 500)