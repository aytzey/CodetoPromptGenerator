# File: python_backend/services/exclusion_service.py
# NEW FILE
import os
import logging
import re
from typing import Any, Dict, List, Optional
from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository

logger = logging.getLogger(__name__)

_PROJECT_IGNORE_FILES: List[str] = [
    ".gitignore",
    ".dockerignore",
    ".ignore",
    ".codetopromptignore",
]


def _clean_pattern(pattern: object) -> Optional[str]:
    if not isinstance(pattern, str):
        return None
    cleaned = re.sub(r"/+", "/", pattern.strip().replace("\\", "/"))
    if not cleaned or cleaned.startswith("#"):
        return None
    return cleaned


def _clean_patterns(patterns: List[object]) -> List[str]:
    seen = set()
    cleaned_patterns: List[str] = []
    for pattern in patterns:
        cleaned = _clean_pattern(pattern)
        if cleaned is None or cleaned in seen:
            continue
        seen.add(cleaned)
        cleaned_patterns.append(cleaned)
    return cleaned_patterns


@wrap_service_methods
class ExclusionService:
    """Service layer for managing global and local exclusions."""

    def __init__(self, storage_repo: FileStorageRepository):
        self.storage_repo = storage_repo
        # Define paths relative to the *backend* directory structure might be better
        # Or pass project_root explicitly during initialization or method calls
        self.project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
        self.global_ignore_filename = 'ignoreDirs.txt'
        self.local_exclusions_filename = 'localExclusions.json'
        self.codetoprompt_dir_name = '.codetoprompt'

    def get_global_exclusions(self) -> List[str]:
        """Reads global exclusions from ignoreDirs.txt."""
        file_path = os.path.join(self.project_root, self.global_ignore_filename)
        try:
            return _clean_patterns(self.storage_repo.read_lines(file_path))
        except Exception as e:
            logger.error(f"Failed to read global exclusions: {e}")
            # Decide if returning empty list or raising is better
            return []

    def update_global_exclusions(self, exclusions: List[str]) -> List[str]:
        """Updates the global exclusions file."""
        if not isinstance(exclusions, list):
            raise ValueError("Exclusions must be a list of strings")

        file_path = os.path.join(self.project_root, self.global_ignore_filename)
        cleaned_exclusions = _clean_patterns(exclusions)
        try:
            self.storage_repo.write_lines(file_path, cleaned_exclusions)
            return cleaned_exclusions
        except IOError as e:
            logger.error(f"Failed to write global exclusions: {e}")
            raise # Re-raise IOErrors to be caught by controller

    def _get_local_exclusions_path(self, project_path: str) -> str:
        """Constructs the path to the local exclusions file for a project."""
        if not project_path or not os.path.isdir(project_path):
             raise ValueError("Invalid project path provided.")
        return os.path.join(project_path, self.codetoprompt_dir_name, self.local_exclusions_filename)

    def get_local_exclusions(self, project_path: str) -> List[str]:
        """Reads local exclusions for a specific project."""
        file_path = self._get_local_exclusions_path(project_path)
        try:
            # Default to empty list if file doesn't exist or is invalid
            data = self.storage_repo.read_json(file_path, default=[])
            if not isinstance(data, list):
                logger.warning(f"Local exclusions file {file_path} is not a list. Returning empty.")
                return []
            # Ensure all items are strings
            return _clean_patterns(data)
        except Exception as e:
            logger.error(f"Failed to read local exclusions for {project_path}: {e}")
            return []

    def get_project_ignore_exclusions(self, project_path: str) -> List[Dict[str, Any]]:
        """Reads project ignore-file patterns with their source filenames."""
        if not project_path or not os.path.isdir(project_path):
            raise ValueError("Invalid project path provided.")

        entries: List[Dict[str, Any]] = []
        seen = set()

        for filename in _PROJECT_IGNORE_FILES:
            file_path = os.path.join(project_path, filename)
            if not os.path.isfile(file_path):
                continue

            try:
                lines = self.storage_repo.read_lines(file_path)
            except Exception as exc:
                logger.warning("Failed to read project ignore file %s: %s", file_path, exc)
                continue

            for line in lines:
                pattern = _clean_pattern(line)
                if pattern is None:
                    continue

                key = (filename, pattern)
                if key in seen:
                    continue
                seen.add(key)
                entries.append(
                    {
                        "source": filename,
                        "pattern": pattern,
                        "negated": pattern.startswith("!"),
                    }
                )

        return entries

    def update_local_exclusions(self, project_path: str, exclusions: List[str]) -> List[str]:
        """Updates the local exclusions for a specific project."""
        if not isinstance(exclusions, list):
            raise ValueError("Local exclusions must be a list of strings")

        file_path = self._get_local_exclusions_path(project_path)
        # Ensure all items are strings before saving
        cleaned_exclusions = _clean_patterns(exclusions)
        try:
            self.storage_repo.write_json(file_path, cleaned_exclusions)
            return cleaned_exclusions
        except IOError as e:
            logger.error(f"Failed to write local exclusions for {project_path}: {e}")
            raise
