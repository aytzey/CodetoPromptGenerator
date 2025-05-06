# python_backend/controllers/autoselect_controller.py
from __future__ import annotations

import logging
from typing import Any, Dict
import json

from flask import Blueprint, request

from models.autoselect_request import AutoSelectRequest
from services.autoselect_service import AutoselectService, ConfigError, UpstreamError
from utils.response_utils import error_response, success_response

logger = logging.getLogger(__name__)

_autosel = AutoselectService()
autosel_bp = Blueprint("autoselect", __name__, url_prefix="/api")

# ───────────────────────────────── helpers ──────────────────────────────────
def _validate_payload(data: Dict[str, Any]) -> AutoSelectRequest:
    """
    Create an `AutoSelectRequest` instance.

    * If the class is a Pydantic model (v1 or v2) we use its validation APIs.
    * Otherwise we assume it’s a regular dataclass / plain class and call
      the constructor directly (**data).
    """
    if hasattr(AutoSelectRequest, "model_validate"):          # Pydantic v2
        return AutoSelectRequest.model_validate(data)         # type: ignore[attr-defined]
    if hasattr(AutoSelectRequest, "parse_obj"):               # Pydantic v1
        return AutoSelectRequest.parse_obj(data)              # type: ignore[attr-defined]
    try:                                                      # plain dataclass
        return AutoSelectRequest(**data)                      # type: ignore[arg-type]
    except Exception as exc:
        raise ValueError(f"Invalid payload: {exc}") from exc


# ───────────────────────────────── endpoint ─────────────────────────────────
@autosel_bp.post("/autoselect")
def api_autoselect():
    payload: Dict[str, Any] = request.get_json(silent=True) or {}
    debug: bool = request.args.get("debug", "").lower() in {"1", "true", "yes"}

    # ---------- validate ----------------------------------------------------
    try:
        req = _validate_payload(payload)
    except Exception as exc:
        return error_response(str(exc), status_code=400)

    # ---------- call service ------------------------------------------------
    try:
        selected, raw_reply, dbg = _autosel.autoselect_paths(
            req, return_debug=debug
        )
    except ConfigError as exc:
        return error_response(str(exc), status_code=500)
    except UpstreamError as exc:
        return error_response(str(exc), status_code=502)
    #---------- log response -----------------------------------------------
    # if dbg:
    #     pretty = json.dumps(dbg, indent=2, ensure_ascii=False)
    #     logger.info("▶︎ Codemap summaries (%d files):\n%s", len(dbg), pretty)
    resp: Dict[str, Any] = {
        "selected": selected,
        "llmRaw": raw_reply,
    }
    if debug and dbg is not None:
        resp["codemap"] = dbg

    return success_response(data=resp)
