"""
controllers/autoselect_controller.py
────────────────────────────────────
HTTP endpoint:

    POST /api/autoselect
        Body: { "instructions": str, "treePaths": str[] }

Behaviour is fully specified in *feature request*; see inline docs below.
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

# ───── Blueprint & service singletons ───────────────────────────────────────
autoselect_bp = Blueprint("autoselect_bp", __name__, url_prefix="/api")
_service      = AutoselectService()
# (No direct I/O in global scope → import‑time side‑effects kept minimal.)

# ────────────────────────────────────────────────────────────────────────────
# 1 · POST /api/autoselect
# ────────────────────────────────────────────────────────────────────────────
@autoselect_bp.post("/autoselect")
def api_autoselect():
    """
    Validate JSON body, ensure ``OPENROUTER_API_KEY`` exists, forward the
    request to :class:`AutoselectService`, and return the envelope:

        { "success": true,  "data": [...] }
        { "success": false, "error": "…", … }

    Error → status‑codes  
        • 400 – bad request / missing API‑key  
        • 502 – upstream failure  
        • 500 – everything else
    """
    payload = request.get_json(silent=True) or {}
    try:
        body = AutoSelectRequest.from_dict(payload)
    except ValueError as exc:
        return error_response(str(exc), status_code=HTTPStatus.BAD_REQUEST)

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return error_response(
            "Server mis‑configuration: environment variable 'OPENROUTER_API_KEY' "
            "is not set.",
            status_code=HTTPStatus.BAD_REQUEST,
        )

    try:
        selected = _service.autoselect_paths(body, api_key)
        return success_response(data=selected, status_code=HTTPStatus.OK)
    except AutoselectService.UpstreamError as exc:
        return error_response(str(exc), status_code=HTTPStatus.BAD_GATEWAY)
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled error in /api/autoselect")
        return error_response(str(exc), status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
