# File: python_backend/controllers/token_count_controller.py
# REFACTOR / OVERWRITE
import logging
from flask import Blueprint, request, current_app
from services.project_service import ProjectService # Use tokenizer from ProjectService
from repositories.file_storage import FileStorageRepository # Dependencies for ProjectService
from services.exclusion_service import ExclusionService
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)
token_blueprint = Blueprint('token_blueprint', __name__)

# --- Dependency Setup ---
# These are needed because ProjectService depends on them
storage_repo = FileStorageRepository()
exclusion_service = ExclusionService(storage_repo=storage_repo)
# Instantiate ProjectService to access estimate_token_count
project_service = ProjectService(storage_repo=storage_repo, exclusion_service=exclusion_service)
# --- End Dependency Setup ---

@token_blueprint.route('/api/tokenCount', methods=['POST'])
def get_token_count_endpoint():
    """
    Estimates token count for the provided text using the service's method.
    Body: { text: "<string>" }
    """
    data = request.get_json()
    if data is None or 'text' not in data:
        return error_response("Missing 'text' in request body.", status_code=400)

    text = data.get('text', '')
    if not isinstance(text, str):
         return error_response("'text' must be a string.", status_code=400)

    try:
        token_count = project_service.estimate_token_count(text)
        return success_response(data={'tokenCount': token_count}) # Wrap in dict
    except Exception as e:
        logger.exception("Error estimating token count")
        return error_response(str(e), "Failed to estimate token count", 500)