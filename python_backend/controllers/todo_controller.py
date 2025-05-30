# python_backend/controllers/todo_controller.py
import logging
import os
from flask import Blueprint, request
from pydantic import ValidationError

from services.todo_service import TodoService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
from models.request_models import TodoCreateRequest, TodoUpdateRequest  # NEW

logger = logging.getLogger(__name__)
todo_blueprint = Blueprint("todo_blueprint", __name__)

# ─── dependencies ───────────────────────────────────────────────────────────
_storage = FileStorageRepository()
_todo_s  = TodoService(storage_repo=_storage)
# ────────────────────────────────────────────────────────────────────────────


@todo_blueprint.get("/api/todos")
def list_todos_endpoint():
    project_path = request.args.get("projectPath")
    try:
        items = _todo_s.list_todos(project_path)
        return success_response(data=items)
    except Exception as exc:
        logger.exception("Error listing todos for project: %s", project_path)
        return error_response(str(exc), "Failed to list todos", 500)


@todo_blueprint.post("/api/todos")
def add_todo_endpoint():
    project_path = request.args.get("projectPath")
    payload = request.get_json(silent=True) or {}
    try:
        req = TodoCreateRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        new_item = _todo_s.add_todo(req.text.strip(), project_path, req.createdAt)
        return success_response(data=new_item, status_code=201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except IOError as exc:
        logger.error("IOError adding todo for project %s: %s", project_path, exc)
        return error_response(str(exc), "Failed to save todo", 500)
    except Exception as exc:
        logger.exception("Error adding todo for project: %s", project_path)
        return error_response(str(exc), "Failed to add todo", 500)


@todo_blueprint.put("/api/todos/<int:todo_id>")
def update_todo_endpoint(todo_id: int):
    project_path = request.args.get("projectPath")
    payload = request.get_json(silent=True) or {}
    try:
        req = TodoUpdateRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        updated_item = _todo_s.update_todo(todo_id, req.completed, project_path)
        if updated_item is None:
            return error_response("Todo not found.", 404)
        return success_response(data=updated_item)
    except IOError as exc:
        logger.error("IOError updating todo %d for project %s: %s", todo_id, project_path, exc)
        return error_response(str(exc), "Failed to save todo update", 500)
    except Exception as exc:
        logger.exception("Error updating todo %d for project: %s", todo_id, project_path)
        return error_response(str(exc), "Failed to update todo", 500)


@todo_blueprint.delete("/api/todos/<int:todo_id>")
def delete_todo_endpoint(todo_id: int):
    project_path = request.args.get("projectPath")
    try:
        deleted = _todo_s.delete_todo(todo_id, project_path)
        if not deleted:
            return error_response("Todo not found.", 404)
        return "", 204
    except IOError as exc:
        logger.error("IOError deleting todo %d for project %s: %s", todo_id, project_path, exc)
        return error_response(str(exc), "Failed to save after deletion", 500)
    except Exception as exc:
        logger.exception("Error deleting todo %d for project: %s", todo_id, project_path)
        return error_response(str(exc), "Failed to delete todo", 500)
