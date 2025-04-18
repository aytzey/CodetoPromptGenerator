# FILE: python_backend/controllers/prompt_controller.py
# NEW FILE - Verified
import os
import logging
from http import HTTPStatus
from flask import Blueprint, request, current_app

from services.prompt_service import PromptService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

prompt_bp = Blueprint("prompt_bp", __name__, url_prefix="/api/prompt")

# Instantiate service (consider dependency injection for larger apps)
_prompt_service = PromptService()

@prompt_bp.post("/refine")
def refine_prompt_endpoint():
    """
    POST /api/prompt/refine
    Body: { "text": "<string>" }
    Refines the input text into a well-written English prompt using an LLM.
    """
    payload = request.get_json(silent=True) or {}
    text_to_refine = payload.get("text")

    if not text_to_refine or not isinstance(text_to_refine, str) or not text_to_refine.strip(): # Added strip check
        return error_response("Missing or invalid 'text' field in request body.", status_code=HTTPStatus.BAD_REQUEST)

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        logger.error("OPENROUTER_API_KEY environment variable is not set.")
        return error_response(
            "Server configuration error: API key not available.",
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        )

    try:
        refined_prompt = _prompt_service.refine_prompt(text_to_refine, api_key)
        # Ensure the response format matches what the frontend expects
        return success_response(data={"refinedPrompt": refined_prompt})
    except ValueError as ve:
        logger.warning(f"Validation error during prompt refinement: {ve}")
        return error_response(str(ve), status_code=HTTPStatus.BAD_REQUEST)
    except PromptService.UpstreamError as ue:
        logger.error(f"Upstream API error during prompt refinement: {ue}")
        # Provide a slightly more user-friendly message for upstream issues
        return error_response(f"Failed to refine prompt via external service: {ue}", status_code=HTTPStatus.BAD_GATEWAY)
    except Exception as e:
        logger.exception("Unhandled exception during prompt refinement.")
        # Avoid leaking internal details in production
        error_message = str(e) if current_app.config.get("DEBUG") else "Internal server error during prompt refinement."
        return error_response(error_message, status_code=HTTPStatus.INTERNAL_SERVER_ERROR)