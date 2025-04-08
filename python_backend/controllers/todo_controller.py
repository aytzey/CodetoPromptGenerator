# File: python_backend/controllers/todo_controller.py
# REFACTOR / OVERWRITE
import os
import logging
from flask import Blueprint, request, current_app
from services.todo_service import TodoService
from repositories.file_storage import FileStorageRepository # Need repo instance
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)
todo_blueprint = Blueprint('todo_blueprint', __name__)

# --- Dependency Setup ---
storage_repo = FileStorageRepository()
todo_service = TodoService(storage_repo=storage_repo)
# --- End Dependency Setup ---

@todo_blueprint.route('/api/todos', methods=['GET'])
def list_todos_endpoint():
    """Lists todos, using projectPath query param if provided."""
    project_path = request.args.get('projectPath') # Returns None if not present
    try:
        items = todo_service.list_todos(project_path)
        return success_response(data=items)
    except Exception as e:
        logger.exception(f"Error listing todos for project: {project_path}")
        return error_response(str(e), "Failed to list todos", 500)

@todo_blueprint.route('/api/todos', methods=['POST'])
def add_todo_endpoint():
    """Adds a new todo, using projectPath query param if provided."""
    project_path = request.args.get('projectPath')
    payload = request.get_json()
    if payload is None or 'text' not in payload:
        return error_response("Missing 'text' in request body.", status_code=400)

    text = payload.get('text', '').strip()
    created_at = payload.get('createdAt') # Optional

    try:
        new_item = todo_service.add_todo(text, project_path, created_at)
        return success_response(data=new_item, status_code=201) # 201 Created
    except ValueError as e: # Catches empty text error
        return error_response(str(e), status_code=400)
    except IOError as e:
        logger.error(f"IOError adding todo for project {project_path}: {e}")
        return error_response(str(e), "Failed to save todo", 500)
    except Exception as e:
        logger.exception(f"Error adding todo for project: {project_path}")
        return error_response(str(e), "Failed to add todo", 500)


@todo_blueprint.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo_endpoint(todo_id):
    """Updates a todo's completion status."""
    project_path = request.args.get('projectPath')
    payload = request.get_json()
    if payload is None or 'completed' not in payload or not isinstance(payload['completed'], bool):
        return error_response("Invalid request body. Boolean 'completed' field required.", status_code=400)

    completed = payload['completed']

    try:
        updated_item = todo_service.update_todo(todo_id, completed, project_path)
        if updated_item is None:
            return error_response("Todo not found.", status_code=404)
        return success_response(data=updated_item)
    except IOError as e:
        logger.error(f"IOError updating todo {todo_id} for project {project_path}: {e}")
        return error_response(str(e), "Failed to save todo update", 500)
    except Exception as e:
        logger.exception(f"Error updating todo {todo_id} for project: {project_path}")
        return error_response(str(e), "Failed to update todo", 500)

@todo_blueprint.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo_endpoint(todo_id):
    """Deletes a todo."""
    project_path = request.args.get('projectPath')
    try:
        deleted = todo_service.delete_todo(todo_id, project_path)
        if not deleted:
            return error_response("Todo not found.", status_code=404)
        # Return 204 No Content on successful deletion is common practice
        return "", 204
        # Or return success_response(message="Todo deleted.")
    except IOError as e:
         logger.error(f"IOError deleting todo {todo_id} for project {project_path}: {e}")
         return error_response(str(e), "Failed to save after deletion", 500)
    except Exception as e:
        logger.exception(f"Error deleting todo {todo_id} for project: {project_path}")
        return error_response(str(e), "Failed to delete todo", 500)