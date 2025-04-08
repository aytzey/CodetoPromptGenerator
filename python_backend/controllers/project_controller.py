# File: python_backend/controllers/project_controller.py
# REFACTOR / OVERWRITE
import os
import logging
from flask import Blueprint, request, current_app
from services.project_service import ProjectService
from services.exclusion_service import ExclusionService # Need exclusion service
from repositories.file_storage import FileStorageRepository # Need repo instance
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)
project_blueprint = Blueprint('project_blueprint', __name__)

# --- Dependency Setup ---
storage_repo = FileStorageRepository()
# ProjectService needs ExclusionService to get ignores when building tree
exclusion_service = ExclusionService(storage_repo=storage_repo)
project_service = ProjectService(storage_repo=storage_repo, exclusion_service=exclusion_service)
# --- End Dependency Setup ---


@project_blueprint.route('/api/projects/tree', methods=['GET'])
def get_project_tree_endpoint():
    """Gets the file tree for a given root directory."""
    root_dir = request.args.get('rootDir')
    if not root_dir:
        return error_response("Missing 'rootDir' query parameter.", status_code=400)

    try:
        tree = project_service.get_project_tree(root_dir)
        return success_response(data=tree)
    except ValueError as e: # Catches invalid root dir from service
        return error_response(str(e), status_code=400)
    except FileNotFoundError as e: # If root dir doesn't exist after checks
         return error_response(str(e), status_code=404)
    except PermissionError as e:
        logger.warning(f"Permission error getting tree for {root_dir}: {e}")
        return error_response(str(e), "Permission denied while scanning directory", 403)
    except Exception as e:
        logger.exception(f"Error getting project tree for {root_dir}")
        return error_response(str(e), "Failed to get project tree", 500)


@project_blueprint.route('/api/projects/files', methods=['POST'])
def get_files_content_endpoint():
    """Fetches content and token count for specified files."""
    data = request.get_json()
    if data is None or 'baseDir' not in data or 'paths' not in data or not isinstance(data['paths'], list):
        return error_response("Invalid request body. Requires 'baseDir' (string) and 'paths' (list).", status_code=400)

    base_dir = data['baseDir']
    relative_paths = data['paths']

    try:
        files_data = project_service.get_files_content(base_dir, relative_paths)
        return success_response(data=files_data)
    except ValueError as e: # Catches invalid baseDir or paths list
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Error getting file contents for {base_dir}")
        return error_response(str(e), "Failed to get file contents", 500)


@project_blueprint.route('/api/browse_folders', methods=['GET'])
def browse_folders_endpoint():
    """Gets subfolders for a given path."""
    target_path = request.args.get('path', os.getcwd()) # Default to CWD if no path

    try:
        browse_info = project_service.get_folder_browse_info(target_path)
        # Adapt the structure slightly to match the old controller's output
        response_data = {
            'current_path': browse_info['current_path'],
            'parent_path': browse_info['parent_path'],
            'folders': browse_info['folders']
        }
        return success_response(data=response_data)
    except FileNotFoundError as e:
        return error_response(str(e), status_code=404)
    except PermissionError as e:
        return error_response(str(e), "Permission denied", 403)
    except Exception as e:
        logger.exception(f"Error browsing folders for {target_path}")
        return error_response(str(e), "Failed to browse folders", 500)


@project_blueprint.route('/api/select_drives', methods=['GET'])
def select_drives_endpoint():
    """Gets available drives or common root directories."""
    try:
        drives = project_service.get_available_drives()
        return success_response(data=drives) # Changed key from 'drives' to 'data' for consistency
    except Exception as e:
        logger.exception("Error selecting drives")
        return error_response(str(e), "Failed to get drives", 500)