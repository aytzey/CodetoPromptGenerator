# File: python_backend/controllers/exclusions_controller.py
# REFACTOR / OVERWRITE
import os
import logging
from flask import Blueprint, request, current_app
from services.exclusion_service import ExclusionService
from repositories.file_storage import FileStorageRepository # Need repo instance
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)
exclusions_blueprint = Blueprint('exclusions_blueprint', __name__)

# --- Dependency Setup ---
# In a real app, use Flask extensions or a proper DI container
# For simplicity here, we instantiate directly.
storage_repo = FileStorageRepository()
exclusion_service = ExclusionService(storage_repo=storage_repo)
# --- End Dependency Setup ---


@exclusions_blueprint.route('/api/exclusions', methods=['GET', 'POST'])
def handle_global_exclusions():
    """
    Handles GET and POST requests for global exclusions (ignoreDirs.txt).
    """
    if request.method == 'GET':
        try:
            exclusions = exclusion_service.get_global_exclusions()
            return success_response(data=exclusions)
        except Exception as e:
            logger.exception("Error getting global exclusions") # Log full traceback
            return error_response(str(e), "Failed to retrieve global exclusions", 500)

    elif request.method == 'POST':
        data = request.get_json()
        if data is None or 'exclusions' not in data or not isinstance(data['exclusions'], list):
            return error_response("Invalid request body. 'exclusions' list required.", status_code=400)

        try:
            updated_exclusions = exclusion_service.update_global_exclusions(data['exclusions'])
            return success_response(data=updated_exclusions, message="Global exclusions updated.")
        except ValueError as e:
             return error_response(str(e), status_code=400)
        except IOError as e:
            logger.error(f"IOError updating global exclusions: {e}")
            return error_response(str(e), "Failed to write global exclusions file", 500)
        except Exception as e:
            logger.exception("Error updating global exclusions")
            return error_response(str(e), "Failed to update global exclusions", 500)

@exclusions_blueprint.route('/api/localExclusions', methods=['GET', 'POST'])
def handle_local_exclusions():
    """
    Handles GET and POST requests for project-specific local exclusions.
    Requires 'projectPath' query parameter.
    """
    project_path = request.args.get('projectPath')
    if not project_path:
        return error_response("Missing 'projectPath' query parameter.", status_code=400)

    # Basic validation: check if path looks plausible (exists and is directory)
    # Service layer also validates, but good to have early check
    if not os.path.isdir(project_path):
         return error_response(f"Project path '{project_path}' not found or is not a directory.", status_code=404)


    if request.method == 'GET':
        try:
            exclusions = exclusion_service.get_local_exclusions(project_path)
            return success_response(data=exclusions)
        except ValueError as e: # Catch invalid project path from service
             return error_response(str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error getting local exclusions for {project_path}")
            return error_response(str(e), "Failed to retrieve local exclusions", 500)

    elif request.method == 'POST':
        data = request.get_json()
        if data is None or 'localExclusions' not in data or not isinstance(data['localExclusions'], list):
            return error_response("Invalid request body. 'localExclusions' list required.", status_code=400)

        try:
            updated_exclusions = exclusion_service.update_local_exclusions(project_path, data['localExclusions'])
            return success_response(data=updated_exclusions, message="Local exclusions updated.")
        except ValueError as e:
             return error_response(str(e), status_code=400)
        except IOError as e:
            logger.error(f"IOError updating local exclusions for {project_path}: {e}")
            return error_response(str(e), "Failed to write local exclusions file", 500)
        except Exception as e:
            logger.exception(f"Error updating local exclusions for {project_path}")
            return error_response(str(e), "Failed to update local exclusions", 500)