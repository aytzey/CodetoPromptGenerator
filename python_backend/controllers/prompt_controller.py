# FILE: python_backend/controllers/prompt_controller.py
# UPDATED: Extract treeText and pass to service
import os
import logging
from http import HTTPStatus
from flask import Blueprint, request, current_app

from services.prompt_service import PromptService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

prompt_bp = Blueprint("prompt_bp", __name__, url_prefix="/api/prompt")

_prompt_service = PromptService()

@prompt_bp.post("/refine")
def refine_prompt_endpoint():
    """
    POST /api/prompt/refine
    Body: { "text": "<string>", "treeText"?: "<string>" }
    Refines the input text into a well-written English prompt using an LLM,
    optionally using the provided file tree text for context.
    """
    payload = request.get_json(silent=True) or {}
    text_to_refine = payload.get("text")
    tree_text = payload.get("treeText") # Extract optional treeText

    if not text_to_refine or not isinstance(text_to_refine, str) or not text_to_refine.strip():
        return error_response("Missing or invalid 'text' field in request body.", status_code=HTTPStatus.BAD_REQUEST)

    # Validate treeText if present (optional)
    if tree_text is not None and not isinstance(tree_text, str):
         return error_response("Optional 'treeText' field must be a string if provided.", status_code=HTTPStatus.BAD_REQUEST)

    try:
        # Pass tree_text to the service method
        refined_prompt = _prompt_service.refine_prompt(text_to_refine, tree_text=tree_text)
        return success_response(data={"refinedPrompt": refined_prompt})
    except ValueError as ve:
        logger.warning(f"Validation error during prompt refinement: {ve}")
        return error_response(str(ve), status_code=HTTPStatus.BAD_REQUEST)
    except PromptService.ConfigError as ce:
        logger.error(f"Prompt refinement configuration error: {ce}")
        return error_response(str(ce), status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
    except PromptService.UpstreamError as ue:
        logger.error(f"Upstream API error during prompt refinement: {ue}")
        return error_response(f"Failed to refine prompt via external service: {ue}", status_code=HTTPStatus.BAD_GATEWAY)
    except Exception as e:
        logger.exception("Unhandled exception during prompt refinement.")
        error_message = str(e) if current_app.config.get("DEBUG") else "Internal server error during prompt refinement."
        return error_response(error_message, status_code=HTTPStatus.INTERNAL_SERVER_ERROR)