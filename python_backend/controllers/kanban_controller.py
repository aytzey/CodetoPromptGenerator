# python_backend/controllers/kanban_controller.py
from flask import Blueprint, request
from services.kanban_service import KanbanService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response

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
        items = kanban_service.list_items(project)
        return success_response(data=items)

    # ---------- POST (create) ----------
    payload = request.get_json() or {}
    try:
        new_item = kanban_service.add_item(payload, project)
        return success_response(data=new_item, status_code=201)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        return error_response(str(e), "Failed to create kanban item", 500)


# ───────────────────────────────────────────────────────────────────
# PUT /api/kanban/<id>  — update
# DELETE …              — remove
# ───────────────────────────────────────────────────────────────────
@kanban_bp.route("/api/kanban/<int:item_id>", methods=["PUT", "DELETE"])
def item(item_id: int):
    project = request.args.get("projectPath")

    if request.method == "PUT":
        patch = request.get_json() or {}
        updated = kanban_service.update_item(item_id, patch, project)
        if updated is None:
            return error_response("Item not found", status_code=404)
        return success_response(data=updated)

    # ---------- DELETE ----------
    deleted = kanban_service.delete_item(item_id, project)
    if not deleted:
        return error_response("Item not found", status_code=404)

    # 200 with JSON → FE won't attempt to read a body on 204
    return success_response(data={"deleted": True}, status_code=200)
