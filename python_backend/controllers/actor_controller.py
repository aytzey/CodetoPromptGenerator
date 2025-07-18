# python_backend/controllers/actor_controller.py
from flask import Blueprint, request
from services.actor_service import ActorService
from services.actor_suggest_service import ActorSuggestService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
from pydantic import ValidationError # Import Pydantic's ValidationError
from services.service_exceptions import InvalidInputError, ResourceNotFoundError
import logging

logger = logging.getLogger(__name__)

actor_bp = Blueprint("actor_bp", __name__)

# Dependencies
storage_repo = FileStorageRepository()
actor_service = ActorService(storage_repo)
actor_suggest_service = ActorSuggestService()

# Helper to get projectPath
def _get_project_path():
    project_path = request.args.get("projectPath")
    return project_path

# ───────────────────────────────────────────────────────────────────
# GET /api/actors?projectPath=…   → list all actors
# POST /api/actors?projectPath=…  → create new actor
# ───────────────────────────────────────────────────────────────────
@actor_bp.route("/api/actors", methods=["GET", "POST"])
def actors_collection():
    project_path = _get_project_path()

    if request.method == "GET":
        try:
            actors = actor_service.list_actors(project_path)
            # Convert Pydantic models to dictionaries for JSON serialization
            return success_response(data=[a.dict() for a in actors])
        except InvalidInputError as e:
            return error_response(str(e), str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error listing actors for project: {project_path}")
            return error_response(str(e), "Failed to list actors", 500)

    # ---------- POST (create) ----------
    payload = request.get_json(silent=True) or {}
    try:
        new_actor = actor_service.create_actor(payload, project_path)
        return success_response(data=new_actor.dict(), status_code=201)
    except ValidationError as e:
        return error_response(f"Validation error: {e.json()}", status_code=400)
    except (InvalidInputError, ValueError) as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Error creating actor for project: {project_path}")
        return error_response(str(e), "Failed to create actor", 500)

@actor_bp.route("/api/actors/suggest", methods=["POST"])
def actor_suggest():
    project_path = _get_project_path()
    payload = request.get_json(silent=True) or {}
    description = payload.get("description", "")
    try:
        actors = [a.dict() for a in actor_service.list_actors(project_path)]
        actor_id = actor_suggest_service.suggest(description, actors)
        return success_response(data={"actorId": actor_id})
    except Exception as e:
        logger.exception("Error suggesting actor")
        return error_response(str(e), "Failed to suggest actor", 500)

# ───────────────────────────────────────────────────────────────────
# GET /api/actors/<id>?projectPath=…   → get a single actor
# PUT /api/actors/<id>?projectPath=…   → update an actor
# DELETE /api/actors/<id>?projectPath=…→ delete an actor
# ───────────────────────────────────────────────────────────────────
@actor_bp.route("/api/actors/<int:actor_id>", methods=["GET", "PUT", "DELETE"])
def actor_item(actor_id: int):
    project_path = _get_project_path()

    if request.method == "GET":
        try:
            actors = actor_service.list_actors(project_path) # Need to list all to find by ID
            actor = next((a for a in actors if a.id == actor_id), None)
            if actor is None:
                return error_response("Actor not found", status_code=404)
            return success_response(data=actor.dict())
        except InvalidInputError as e:
            return error_response(str(e), str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error getting actor {actor_id} for project: {project_path}")
            return error_response(str(e), "Failed to retrieve actor", 500)

    elif request.method == "PUT":
        patch = request.get_json(silent=True) or {}
        try:
            updated_actor = actor_service.update_actor(actor_id, patch, project_path)
            if updated_actor is None:
                return error_response("Actor not found", status_code=404)
            return success_response(data=updated_actor.dict())
        except ValidationError as e:
            return error_response(f"Validation error: {e.json()}", status_code=400)
        except ValueError as e:
            return error_response(str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error updating actor {actor_id} for project: {project_path}")
            return error_response(str(e), "Failed to update actor", 500)

    # ---------- DELETE ----------
    elif request.method == "DELETE":
        try:
            deleted = actor_service.delete_actor(actor_id, project_path)
            if not deleted:
                return error_response("Actor not found", status_code=404)
            return "", 204 # 204 No Content
        except InvalidInputError as e:
            return error_response(str(e), str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error deleting actor {actor_id} for project: {project_path}")
            return error_response(str(e), "Failed to delete actor", 500)