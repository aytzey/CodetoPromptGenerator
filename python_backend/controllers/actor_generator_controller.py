from __future__ import annotations

import logging
from flask import Blueprint, request

from models.actor_generate_request import ActorGenerateRequest
from services.actor_generator_service import ActorGeneratorService
# Import standardized exceptions
from services.service_exceptions import ConfigurationError, UpstreamServiceError
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

actor_gen_bp = Blueprint("actor_gen_bp", __name__, url_prefix="/api/actors")
_service = ActorGeneratorService()


@actor_gen_bp.post("/generate")
def generate_actors_endpoint():
    payload = request.get_json(silent=True) or {}
    try:
        req = ActorGenerateRequest.from_dict(payload)
    except ValueError as exc: # Catch validation errors from from_dict
        return error_response(str(exc), status_code=400)
    except Exception as exc: # Catch any other unexpected error during request model creation
        logger.error("Error creating ActorGenerateRequest: %s", exc)
        return error_response(f"Invalid request payload: {exc}", status_code=400)

    try:
        actors, raw = _service.generate_actors(req)
        return success_response(data={"actors": actors, "llmRaw": raw})
    # Use standardized exceptions
    except ConfigurationError as exc:
        logger.error("Actor generation configuration error: %s", exc)
        return error_response(str(exc), status_code=500) # Internal server config error
    except UpstreamServiceError as exc:
        logger.error("Actor generation upstream error: %s", exc)
        return error_response(str(exc), status_code=502) # Bad Gateway from upstream
    except Exception as exc:  # pragma: no cover
        logger.exception("Actor generation failed with an unexpected error.")
        # For general exceptions, it's often better to return a generic error message
        # unless in debug mode.
        return error_response("An unexpected error occurred during actor generation.", status_code=500)