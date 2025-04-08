# File: python_backend/controllers/resolve_folder_controller.py
# REFACTOR / OVERWRITE
import os
import logging
from flask import Blueprint, request, current_app
from services.project_service import ProjectService # Using ProjectService for this logic now
from repositories.file_storage import FileStorageRepository # Need repo instance
from services.exclusion_service import ExclusionService # Needed by ProjectService, but not directly used here
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)
resolve_blueprint = Blueprint('resolve_blueprint', __name__)

# --- Dependency Setup ---
# These are needed because ProjectService depends on them, even if not used directly here
storage_repo = FileStorageRepository()
exclusion_service = ExclusionService(storage_repo=storage_repo)
# Instantiate ProjectService which now contains the resolve logic
project_service = ProjectService(storage_repo=storage_repo, exclusion_service=exclusion_service)
# --- End Dependency Setup ---

@resolve_blueprint.route('/api/resolveFolder', methods=['POST'])
def resolve_folder_endpoint():
    """
    Attempts to resolve a folder name to an absolute path.
    Uses logic now encapsulated within ProjectService.
    """
    data = request.get_json()
    if data is None or 'folderName' not in data:
        return error_response("Missing 'folderName' in request body.", status_code=400)

    folder_name = data.get('folderName', '').strip()

    try:
        resolved_path = project_service.resolve_folder_path(folder_name)
        # The service returns the path directly
        return success_response(data={'path': resolved_path}) # Wrap path in dict for consistency
    except ValueError as e: # Catches empty folder name
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Error resolving folder name: {folder_name}")
        return error_response(str(e), f"Failed to resolve folder: {folder_name}", 500)