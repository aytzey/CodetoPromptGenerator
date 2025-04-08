# File: python_backend/controllers/metaprompts_controller.py
# REFACTOR / OVERWRITE
import os
import logging
from flask import Blueprint, request, current_app
from services.metaprompt_service import MetapromptService
from repositories.file_storage import FileStorageRepository # Need repo instance
from utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)
metaprompts_blueprint = Blueprint('metaprompts_blueprint', __name__)

# --- Dependency Setup ---
storage_repo = FileStorageRepository()
metaprompt_service = MetapromptService(storage_repo=storage_repo)
# --- End Dependency Setup ---

@metaprompts_blueprint.route('/api/metaprompts', methods=['GET'])
def list_or_load_metaprompt():
    """
    Handles listing or loading meta prompts based on 'action' query param.
    Optional 'dir' query param specifies the directory.
    Optional 'file' query param specifies the file to load.
    """
    action = request.args.get('action', '').strip().lower()
    dir_param = request.args.get('dir') # None if not present

    if action == 'list':
        try:
            files = metaprompt_service.list_metaprompts(dir_param)
            return success_response(data=files)
        except IOError as e: # Catch directory access issues
            return error_response(str(e), "Cannot access meta prompts directory", 500)
        except Exception as e:
            logger.exception("Error listing meta prompts")
            return error_response(str(e), "Failed to list meta prompts", 500)

    elif action == 'load':
        filename = request.args.get('file', '').strip()
        if not filename:
            return error_response("Missing 'file' query parameter for load action.", status_code=400)

        try:
            content = metaprompt_service.load_metaprompt(filename, dir_param)
            if content is None:
                return error_response(f"Meta prompt file '{filename}' not found.", status_code=404)
            # Return content directly in data field for consistency maybe?
            # Or specific field like 'content'
            return success_response(data={'content': content}) # Changed to return dict
        except IOError as e:
            return error_response(str(e), "Cannot access meta prompts directory", 500)
        except Exception as e:
            logger.exception(f"Error loading meta prompt: {filename}")
            return error_response(str(e), f"Failed to load meta prompt: {filename}", 500)

    else:
        return error_response(f"Invalid action '{action}'. Use 'list' or 'load'.", status_code=400)


@metaprompts_blueprint.route('/api/metaprompts', methods=['POST'])
def save_metaprompt_endpoint():
    """
    Saves content to a meta prompt file.
    Requires JSON body: { "filename": "...", "content": "..." }
    Optional 'dir' query param specifies the directory.
    """
    dir_param = request.args.get('dir')
    data = request.get_json()

    if data is None or 'filename' not in data or 'content' not in data:
        return error_response("Invalid request body. Requires 'filename' and 'content'.", status_code=400)

    filename = data.get('filename', '').strip()
    content = data.get('content', '') # Allow empty content if needed

    try:
        metaprompt_service.save_metaprompt(filename, content, dir_param)
        # Ensure filename has .txt extension if it was added
        saved_filename = filename if filename.lower().endswith('.txt') else filename + '.txt'
        return success_response(message=f"Meta prompt '{saved_filename}' saved successfully.")
    except ValueError as e:
        return error_response(str(e), status_code=400)
    except IOError as e:
        logger.error(f"IOError saving meta prompt {filename}: {e}")
        return error_response(str(e), "Failed to save meta prompt file", 500)
    except Exception as e:
        logger.exception(f"Error saving meta prompt: {filename}")
        return error_response(str(e), "Failed to save meta prompt", 500)