# python_backend/controllers/user_story_controller.py
from flask import Blueprint, request
from services.user_story_service import UserStoryService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
import logging

logger = logging.getLogger(__name__)

user_story_bp = Blueprint("user_story_bp", __name__)

# Dependencies
storage_repo = FileStorageRepository()
user_story_service = UserStoryService(storage_repo)

# Helper to get projectPath
def _get_project_path():
    project_path = request.args.get("projectPath")
    # UserStoryService handles None project_path by falling back to ~/.codetoprompt
    return project_path

# ───────────────────────────────────────────────────────────────────
# GET /api/user-stories?projectPath=…   → list all stories
# POST /api/user-stories?projectPath=…  → create new story
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories", methods=["GET", "POST"])
def user_stories_collection():
    project_path = _get_project_path()

    if request.method == "GET":
        try:
            stories = user_story_service.list_stories(project_path)
            return success_response(data=stories)
        except Exception as e:
            logger.exception(f"Error listing user stories for project: {project_path}")
            return error_response(str(e), "Failed to list user stories", 500)

    # ---------- POST (create) ----------
    payload = request.get_json(silent=True) or {}
    try:
        new_story = user_story_service.create_story(payload, project_path)
        return success_response(data=new_story, status_code=201)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Error creating user story for project: {project_path}")
        return error_response(str(e), "Failed to create user story", 500)

# ───────────────────────────────────────────────────────────────────
# GET /api/user-stories/<id>?projectPath=…   → get a single story
# PUT /api/user-stories/<id>?projectPath=…   → update a story
# DELETE /api/user-stories/<id>?projectPath=…→ delete a story
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories/<int:story_id>", methods=["GET", "PUT", "DELETE"])
def user_story_item(story_id: int):
    project_path = _get_project_path()

    if request.method == "GET":
        try:
            story = user_story_service.get_story(story_id, project_path)
            if story is None:
                return error_response("User story not found", status_code=404)
            return success_response(data=story)
        except Exception as e:
            logger.exception(f"Error getting user story {story_id} for project: {project_path}")
            return error_response(str(e), "Failed to retrieve user story", 500)

    elif request.method == "PUT":
        patch = request.get_json(silent=True) or {}
        try:
            updated_story = user_story_service.update_story(story_id, patch, project_path)
            if updated_story is None:
                return error_response("User story not found", status_code=404)
            return success_response(data=updated_story)
        except ValueError as e:
            return error_response(str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error updating user story {story_id} for project: {project_path}")
            return error_response(str(e), "Failed to update user story", 500)

    # ---------- DELETE ----------
    elif request.method == "DELETE":
        try:
            deleted = user_story_service.delete_story(story_id, project_path)
            if not deleted:
                return error_response("User story not found", status_code=404)
            return "", 204 # 204 No Content
        except Exception as e:
            logger.exception(f"Error deleting user story {story_id} for project: {project_path}")
            return error_response(str(e), "Failed to delete user story", 500)

# ───────────────────────────────────────────────────────────────────
# PUT /api/user-stories/<id>/tasks?projectPath=…   → associate/update tasks
# POST /api/user-stories/<id>/tasks?projectPath=…  → add a single task
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories/<int:story_id>/tasks", methods=["PUT", "POST"])
def user_story_tasks_collection(story_id: int):
    project_path = _get_project_path()
    payload = request.get_json(silent=True) or {}

    if request.method == "PUT":
        task_ids = payload.get("taskIds")
        if not isinstance(task_ids, list) or not all(isinstance(t, int) for t in task_ids):
            return error_response("'taskIds' must be an array of integers.", status_code=400)
        try:
            user_story_service.associate_tasks(story_id, task_ids, project_path)
            return success_response(message="Tasks associated successfully.")
        except Exception as e:
            logger.exception(f"Error associating tasks for story {story_id} in project: {project_path}")
            return error_response(str(e), "Failed to associate tasks", 500)

    elif request.method == "POST":
        task_id = payload.get("taskId")
        if not isinstance(task_id, int):
            return error_response("'taskId' must be an integer.", status_code=400)
        try:
            added = user_story_service.add_task_to_story(story_id, task_id, project_path)
            if not added:
                return error_response("Task already associated or story not found.", status_code=409) # 409 Conflict
            return success_response(message="Task added to story.", status_code=201)
        except Exception as e:
            logger.exception(f"Error adding task {task_id} to story {story_id} in project: {project_path}")
            return error_response(str(e), "Failed to add task to story", 500)

# ───────────────────────────────────────────────────────────────────
# DELETE /api/user-stories/<id>/tasks/<taskId>?projectPath=… → remove a single task
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories/<int:story_id>/tasks/<int:task_id>", methods=["DELETE"])
def user_story_task_item(story_id: int, task_id: int):
    project_path = _get_project_path()

    try:
        removed = user_story_service.remove_task_from_story(story_id, task_id, project_path)
        if not removed:
            return error_response("Task association not found", status_code=404)
        return "", 204 # 204 No Content
    except Exception as e:
        logger.exception(f"Error removing task {task_id} from story {story_id} in project: {project_path}")
        return error_response(str(e), "Failed to remove task from story", 500)