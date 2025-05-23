from __future__ import annotations

import logging
from flask import Blueprint, request

from models.actor_generate_request import ActorGenerateRequest
from services.actor_generator_service import ActorGeneratorService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

actor_gen_bp = Blueprint("actor_gen_bp", __name__, url_prefix="/api/actors")
_service = ActorGeneratorService()


@actor_gen_bp.post("/generate")
def generate_actors_endpoint():
    payload = request.get_json(silent=True) or {}
    try:
        req = ActorGenerateRequest.from_dict(payload)
    except Exception as exc:
        return error_response(str(exc), status_code=400)

    try:
        actors, raw = _service.generate_actors(req)
        return success_response(data={"actors": actors, "llmRaw": raw})
    except ActorGeneratorService.ConfigError as exc:
        return error_response(str(exc), status_code=500)
    except ActorGeneratorService.UpstreamError as exc:
        return error_response(str(exc), status_code=502)
    except Exception as exc:  # pragma: no cover
        logger.exception("Actor generation failed")
        return error_response(str(exc), status_code=500)
