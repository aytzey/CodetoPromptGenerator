# FILE: python_backend/controllers/prompt_controller.py
# UPDATED: maps new service_exceptions to HTTP responses
import logging
from http import HTTPStatus
from flask import Blueprint, request, current_app

from services.prompt_service import PromptService
from services.service_exceptions import (
    InvalidInputError,
    ConfigurationError,
    UpstreamServiceError,
)
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

prompt_bp = Blueprint("prompt_bp", __name__, url_prefix="/api/prompt")
_prompt_service = PromptService()


@prompt_bp.post("/refine")
def refine_prompt_endpoint():
    """
    POST /api/prompt/refine
    Body → { "text": "<string>", "treeText"?: "<string>" }
    """
    payload = request.get_json(silent=True) or {}
    text_to_refine = payload.get("text")
    tree_text = payload.get("treeText")

    if not isinstance(text_to_refine, str):
        return error_response(
            "Missing or invalid 'text' field in request body.",
            status_code=HTTPStatus.BAD_REQUEST,
        )
    if tree_text is not None and not isinstance(tree_text, str):
        return error_response(
            "'treeText' must be a string if provided.",
            status_code=HTTPStatus.BAD_REQUEST,
        )

    try:
        refined = _prompt_service.refine_prompt(text_to_refine, tree_text=tree_text)
        return success_response(data={"refinedPrompt": refined})
    except InvalidInputError as exc:
        logger.warning("Prompt refinement validation error: %s", exc)
        return error_response(str(exc), status_code=HTTPStatus.BAD_REQUEST)
    except ConfigurationError as exc:
        logger.error("Prompt refinement configuration error: %s", exc)
        return error_response(str(exc), status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
    except UpstreamServiceError as exc:
        logger.error("Upstream API error during refinement: %s", exc)
        return error_response(
            f"Failed to refine prompt via external service: {exc}",
            status_code=HTTPStatus.BAD_GATEWAY,
        )
    except Exception as exc:  # pragma: no cover
        logger.exception("Unhandled exception during prompt refinement.")
        err_msg = (
            str(exc)
            if current_app.config.get("DEBUG")
            else "Internal server error during prompt refinement."
        )
        return error_response(err_msg, status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
