# python_backend/controllers/metaprompts_controller.py
import logging
from flask import Blueprint, request
from pydantic import ValidationError

from services.metaprompt_service import MetapromptService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
from models.request_models import SaveMetapromptRequest  # NEW

logger = logging.getLogger(__name__)
metaprompts_blueprint = Blueprint("metaprompts_blueprint", __name__)

# ─── dependencies ───────────────────────────────────────────────────────────
_storage     = FileStorageRepository()
_metaprompt  = MetapromptService(storage_repo=_storage)
# ────────────────────────────────────────────────────────────────────────────


@metaprompts_blueprint.get("/api/metaprompts")
def list_or_load_metaprompt():
    action = request.args.get("action", "").strip().lower()
    dir_param = request.args.get("dir")

    if action == "list":
        try:
            files = _metaprompt.list_metaprompts(dir_param)
            return success_response(data=files)
        except IOError as exc:
            return error_response(str(exc), "Cannot access meta prompts directory", 500)
        except Exception as exc:
            logger.exception("Error listing meta prompts")
            return error_response(str(exc), "Failed to list meta prompts", 500)

    if action == "load":
        filename = request.args.get("file", "").strip()
        if not filename:
            return error_response("Missing 'file' query parameter for load action.", 400)
        try:
            content = _metaprompt.load_metaprompt(filename, dir_param)
            if content is None:
                return error_response(f"Meta prompt file '{filename}' not found.", 404)
            return success_response(data={"content": content})
        except IOError as exc:
            return error_response(str(exc), "Cannot access meta prompts directory", 500)
        except Exception as exc:
            logger.exception("Error loading meta prompt: %s", filename)
            return error_response(str(exc), f"Failed to load meta prompt: {filename}", 500)

    return error_response(f"Invalid action '{action}'. Use 'list' or 'load'.", 400)


@metaprompts_blueprint.post("/api/metaprompts")
def save_metaprompt_endpoint():
    dir_param = request.args.get("dir")
    payload = request.get_json(silent=True) or {}
    try:
        req = SaveMetapromptRequest(**payload)
    except ValidationError as exc:
        return error_response(f"Validation error: {exc.errors()}", 400)

    try:
        _metaprompt.save_metaprompt(req.filename, req.content, dir_param)
        saved_name = req.filename if req.filename.lower().endswith(".txt") else f"{req.filename}.txt"
        return success_response(message=f"Meta prompt '{saved_name}' saved successfully.")
    except ValueError as exc:
        return error_response(str(exc), 400)
    except IOError as exc:
        logger.error("IOError saving meta prompt %s: %s", req.filename, exc)
        return error_response(str(exc), "Failed to save meta prompt file", 500)
    except Exception as exc:
        logger.exception("Error saving meta prompt: %s", req.filename)
        return error_response(str(exc), "Failed to save meta prompt", 500)
