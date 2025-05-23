# python_backend/controllers/kanban_controller.py
from flask import Blueprint, request
from services.kanban_service import KanbanService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
import logging

logger = logging.getLogger(__name__)

kanban_bp = Blueprint("kanban_bp", __name__)
storage_repo = FileStorageRepository()
kanban_service = KanbanService(storage_repo)

# ───────────────────────────────────────────────────────────────────
# GET /api/kanban?projectPath=…   → list all cards
# POST /api/kanban?projectPath=…  → create new card
# ───────────────────────────────────────────────────────────────────
@kanban_bp.route("/api/kanban", methods=["GET", "POST"])
def collection():
    project = request.args.get("projectPath")
    if request.method == "GET":
        try:
            items = kanban_service.list_items(project)
            return success_response(data=items)
        except Exception as e:
            logger.exception(f"Error listing kanban items for project: {project}")
            return error_response(str(e), "Failed to list kanban items", 500)

    # ---------- POST (create) ----------
    payload = request.get_json(silent=True) or {}
    try:
        new_item = kanban_service.add_item(payload, project)
        return success_response(data=new_item, status_code=201)
    except ValueError as e:
        logger.warning(f"Validation error creating kanban item: {e}")
        return error_response(str(e), status_code=400)
    except IOError as e: # Explicitly catch IOError for file system issues
        logger.error(f"IOError creating kanban item for project {project}: {e}")
        return error_response(str(e), "Failed to save kanban item (file system error)", 500)
    except Exception as e:
        logger.exception(f"Error creating kanban item for project: {project}")
        return error_response(str(e), "Failed to create kanban item", 500)


# ───────────────────────────────────────────────────────────────────
# PUT /api/kanban/<id>  — update
# DELETE …              — remove
# ───────────────────────────────────────────────────────────────────
@kanban_bp.route("/api/kanban/<int:item_id>", methods=["PUT", "DELETE"])
def item(item_id: int):
    project = request.args.get("projectPath")

    if request.method == "PUT":
        patch = request.get_json(silent=True) or {}
        try:
            updated = kanban_service.update_item(item_id, patch, project)
            if updated is None:
                return error_response("Item not found", status_code=404)
            return success_response(data=updated)
        except ValueError as e:
            logger.warning(f"Validation error updating kanban item {item_id}: {e}")
            return error_response(str(e), status_code=400)
        except IOError as e:
            logger.error(f"IOError updating kanban item {item_id} for project {project}: {e}")
            return error_response(str(e), "Failed to save kanban item update (file system error)", 500)
        except Exception as e:
            logger.exception(f"Error updating kanban item {item_id} for project: {project}")
            return error_response(str(e), "Failed to update kanban item", 500)

    # ---------- DELETE ----------
    elif request.method == "DELETE":
        try:
            deleted = kanban_service.delete_item(item_id, project)
            if not deleted:
                return error_response("Item not found", status_code=404)
            return "", 204 # 204 No Content
        except IOError as e:
            logger.error(f"IOError deleting kanban item {item_id} for project {project}: {e}")
            return error_response(str(e), "Failed to save after deletion (file system error)", 500)
        except Exception as e:
            logger.exception(f"Error deleting kanban item {item_id} for project: {project}")
            return error_response(str(e), "Failed to delete kanban item", 500)