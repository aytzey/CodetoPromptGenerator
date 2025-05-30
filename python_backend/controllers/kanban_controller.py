# python_backend/controllers/kanban_controller.py
import logging
from flask import Blueprint, request
from pydantic import ValidationError

from services.kanban_service import KanbanService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
from models.request_models import KanbanCreateRequest, KanbanUpdateRequest  # NEW

logger = logging.getLogger(__name__)

kanban_bp = Blueprint("kanban_bp", __name__)
storage_repo = FileStorageRepository()
kanban_service = KanbanService(storage_repo)

# ───────────────────────────── collection ──────────────────────────
@kanban_bp.route("/api/kanban", methods=["GET", "POST"])
def collection():
    project = request.args.get("projectPath")

    if request.method == "GET":
        try:
            items = kanban_service.list_items(project)
            return success_response(data=items)
        except Exception as exc:
            logger.exception("Error listing kanban items for project: %s", project)
            return error_response(str(exc), "Failed to list kanban items", 500)

    # ---------- POST (create) ----------
    payload = request.get_json(silent=True) or {}
    try:
        req = KanbanCreateRequest(**payload)
    except ValidationError as exc:
        logger.warning("Validation error creating kanban item: %s", exc)
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        new_item = kanban_service.add_item(req.dict(exclude_unset=True), project)
        return success_response(data=new_item, status_code=201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except IOError as exc:
        logger.error("IOError creating kanban item for project %s: %s", project, exc)
        return error_response(str(exc), "Failed to save kanban item (file system error)", 500)
    except Exception as exc:
        logger.exception("Error creating kanban item for project: %s", project)
        return error_response(str(exc), "Failed to create kanban item", 500)

# ───────────────────────────── single item ─────────────────────────
@kanban_bp.route("/api/kanban/<int:item_id>", methods=["PUT", "DELETE"])
def item(item_id: int):
    project = request.args.get("projectPath")

    if request.method == "PUT":
        patch = request.get_json(silent=True) or {}
        try:
            req = KanbanUpdateRequest(**patch)
        except ValidationError as exc:
            return error_response(f"Validation error: {exc.errors()}", 400)

        try:
            updated = kanban_service.update_item(item_id, req.dict(exclude_unset=True), project)
            if updated is None:
                return error_response("Item not found", 404)
            return success_response(data=updated)
        except ValueError as exc:
            return error_response(str(exc), 400)
        except IOError as exc:
            logger.error("IOError updating kanban item %d for project %s: %s", item_id, project, exc)
            return error_response(str(exc), "Failed to save kanban item update (file system error)", 500)
        except Exception as exc:
            logger.exception("Error updating kanban item %d for project: %s", item_id, project)
            return error_response(str(exc), "Failed to update kanban item", 500)

    # ---------- DELETE ----------
    try:
        deleted = kanban_service.delete_item(item_id, project)
        if not deleted:
            return error_response("Item not found", 404)
        return "", 204
    except IOError as exc:
        logger.error("IOError deleting kanban item %d for project %s: %s", item_id, project, exc)
        return error_response(str(exc), "Failed to save after deletion (file system error)", 500)
    except Exception as exc:
        logger.exception("Error deleting kanban item %d for project: %s", item_id, project)
        return error_response(str(exc), "Failed to delete kanban item", 500)
