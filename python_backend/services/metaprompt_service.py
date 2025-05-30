# File: python_backend/services/metaprompt_service.py
# NEW FILE
import os
import logging
from typing import List, Optional
from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository

logger = logging.getLogger(__name__)



@wrap_service_methods
class MetapromptService:
    """Service layer for managing meta prompt files."""

    def __init__(self, storage_repo: FileStorageRepository):
        self.storage_repo = storage_repo
        # Default directory relative to project root (adjust if needed)
        self.default_dir_relative = os.path.join('sample_project', 'meta_prompts')
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    def _get_base_dir(self, dir_param: Optional[str]) -> str:
        """Determines the base directory for meta prompts."""
        if dir_param:
            base_dir = os.path.abspath(dir_param)
        else:
            base_dir = os.path.join(self.project_root, self.default_dir_relative)

        # Ensure the directory exists
        try:
            os.makedirs(base_dir, exist_ok=True)
        except OSError as e:
            logger.error(f"Failed to create meta prompts directory {base_dir}: {e}")
            raise IOError(f"Cannot access or create meta prompts directory: {base_dir}") from e
        return base_dir

    def list_metaprompts(self, dir_param: Optional[str]) -> List[str]:
        """Lists all .txt files in the meta prompt directory."""
        base_dir = self._get_base_dir(dir_param)
        try:
            return self.storage_repo.list_files(base_dir, extension='.txt')
        except Exception as e:
            logger.error(f"Error listing meta prompts in {base_dir}: {e}")
            return []

    def load_metaprompt(self, filename: str, dir_param: Optional[str]) -> Optional[str]:
        """Loads the content of a specific meta prompt file."""
        if not filename or not filename.lower().endswith('.txt'):
            logger.warning(f"Invalid filename for loading meta prompt: {filename}")
            return None # Or raise ValueError

        base_dir = self._get_base_dir(dir_param)
        file_path = os.path.join(base_dir, filename)

        try:
            content = self.storage_repo.read_text(file_path)
            if content is None:
                 logger.warning(f"Meta prompt file not found: {file_path}")
            return content
        except Exception as e:
            logger.error(f"Error loading meta prompt {file_path}: {e}")
            return None # Or raise

    def save_metaprompt(self, filename: str, content: str, dir_param: Optional[str]):
        """Saves content to a meta prompt file."""
        if not filename:
            raise ValueError("Filename cannot be empty for saving meta prompt.")
        if not isinstance(content, str):
             # Or handle potential non-string content appropriately
            raise ValueError("Content must be a string.")

        # Ensure .txt extension
        if not filename.lower().endswith('.txt'):
            filename += '.txt'

        base_dir = self._get_base_dir(dir_param)
        file_path = os.path.join(base_dir, filename)

        try:
            self.storage_repo.write_text(file_path, content)
            logger.info(f"Meta prompt saved successfully to {file_path}")
        except IOError as e:
            logger.error(f"Failed to save meta prompt to {file_path}: {e}")
            raise # Re-raise IOErrors