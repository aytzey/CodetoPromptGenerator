from __future__ import annotations

import logging
from typing import Any, Dict

from flask import Blueprint, request
from models.autoselect_request import AutoSelectRequest
from services.autoselect_service import AutoselectService, ConfigError, UpstreamError
from utils.response_utils import error_response, success_response

logger = logging.getLogger(__name__)
svc = AutoselectService()
bp = Blueprint("autoselect", __name__, url_prefix="/api")


def _validate(data: Dict[str, Any]) -> AutoSelectRequest:
    return AutoSelectRequest.model_validate(data)


@bp.post("/autoselect")
def api_autoselect():
    payload = request.get_json(silent=True) or {}
    clar = request.args.get("clarify") == "1"
    try:
        req = _validate(payload)
    except Exception as exc:
        return error_response(str(exc), 400)

    clar_payload = payload.get("clarifications") if clar else None
    try:
        selected, meta = svc.autoselect_paths(req, clarifications=clar_payload)
    except ConfigError as exc:
        return error_response(str(exc), 500)
    except UpstreamError as exc:
        return error_response(str(exc), 502)

    return success_response(data={**meta, "selected": selected})


# shorthand for front-end POST /clarify
@bp.post("/autoselect/clarify")
def api_autoselect_clarify():
    data = request.get_json(silent=True) or {}
    payload = data.get("payload") or {}
    answers = data.get("answers") or {}
    payload["clarifications"] = answers
    return api_autoselect.__wrapped__(payload)  # type: ignore
