"""
controllers/autoselect_controller.py
────────────────────────────────────
Changes (2025‑04‑17)
────────────────────
✦  new query‑param **?debug=1** → returns raw LLM reply alongside selection
✦  adapts to AutoselectService return signature (selected, raw)
✦  Service now reads API key from environment, controller no longer fetches it.
"""
from __future__ import annotations

import logging
import os # Keep os import if needed elsewhere, but not for API key here
from http import HTTPStatus

from flask import Blueprint, request

from models.autoselect_request import AutoSelectRequest
from services.autoselect_service import AutoselectService
from utils.response_utils import error_response, success_response

logger = logging.getLogger(__name__)

autoselect_bp = Blueprint("autoselect_bp", __name__, url_prefix="/api")
# Instantiate service (it will load its own config)
_service      = AutoselectService()


@autoselect_bp.post("/autoselect")
@autoselect_bp.post("/codemapi/autoselect")  # legacy alias
def api_autoselect():
    payload = request.get_json(silent=True) or {}
    try:
        body = AutoSelectRequest.from_dict(payload)
    except ValueError as exc:
        return error_response(str(exc), status_code=HTTPStatus.BAD_REQUEST)

    # API key check is now handled within the service
    # api_key = os.getenv("OPENROUTER_API_KEY") # No longer needed here
    # if not api_key:
    #     return error_response(
    #         "Server mis‑configuration: environment variable 'OPENROUTER_API_KEY' is not set.",
    #         status_code=HTTPStatus.BAD_REQUEST, # Should be 500 Internal Server Error
    #     )

    debug_requested = str(request.args.get("debug", "")).lower() in {"1", "true", "yes"}

    try:
        # Pass only the request object, service uses its configured key/model
        selected, raw_reply = _service.autoselect_paths(body)
        if debug_requested:
            data = {"selected": selected, "rawReply": raw_reply}
        else:
            data = selected
        return success_response(data=data, status_code=HTTPStatus.OK)
    except AutoselectService.ConfigError as exc: # Catch config errors from service
        logger.error(f"Autoselect configuration error: {exc}")
        return error_response(str(exc), status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
    except AutoselectService.UpstreamError as exc:
        logger.error(f"Autoselect upstream error: {exc}")
        return error_response(str(exc), status_code=HTTPStatus.BAD_GATEWAY)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error in /api/autoselect")
        return error_response(str(exc), status_code=HTTPStatus.INTERNAL_SERVER_ERROR)