"""
controllers/autoselect_controller.py
────────────────────────────────────
Changes (2025‑04‑17)
────────────────────
✦  new query‑param **?debug=1** → returns raw LLM reply alongside selection
✦  adapts to AutoselectService return signature (selected, raw)
"""
from __future__ import annotations

import logging
import os
from http import HTTPStatus

from flask import Blueprint, request

from models.autoselect_request import AutoSelectRequest
from services.autoselect_service import AutoselectService
from utils.response_utils import error_response, success_response

logger = logging.getLogger(__name__)

autoselect_bp = Blueprint("autoselect_bp", __name__, url_prefix="/api")
_service      = AutoselectService()


@autoselect_bp.post("/autoselect")
@autoselect_bp.post("/codemapi/autoselect")  # legacy alias
def api_autoselect():
    payload = request.get_json(silent=True) or {}
    try:
        body = AutoSelectRequest.from_dict(payload)
    except ValueError as exc:
        return error_response(str(exc), status_code=HTTPStatus.BAD_REQUEST)

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return error_response(
            "Server mis‑configuration: environment variable 'OPENROUTER_API_KEY' is not set.",
            status_code=HTTPStatus.BAD_REQUEST,
        )

    debug_requested = str(request.args.get("debug", "")).lower() in {"1", "true", "yes"}

    try:
        selected, raw_reply = _service.autoselect_paths(body, api_key)
        if debug_requested:
            data = {"selected": selected, "rawReply": raw_reply}
        else:
            data = selected
        return success_response(data=data, status_code=HTTPStatus.OK)
    except AutoselectService.UpstreamError as exc:
        return error_response(str(exc), status_code=HTTPStatus.BAD_GATEWAY)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error in /api/autoselect")
        return error_response(str(exc), status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
