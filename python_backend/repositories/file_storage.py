# File: python_backend/repositories/file_storage.py
# NEW FILE
import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class FileStorageRepository:
    """Handles reading and writing data to JSON files."""

    def _ensure_dir(self, file_path: str):
        """Ensures the directory for the given file path exists."""
        dir_name = os.path.dirname(file_path)
        try:
            os.makedirs(dir_name, exist_ok=True)
        except OSError as e:
            logger.error(f"Error creating directory {dir_name}: {e}")
            raise

    def read_json(self, file_path: str, default: Any = []) -> Any:
        """Reads a JSON file, returning a default value if not found or invalid."""
        if not os.path.exists(file_path):
            return default
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from {file_path}: {e}")
            return default
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            return default

    def write_json(self, file_path: str, data: Any):
        """Writes data to a JSON file."""
        try:
            self._ensure_dir(file_path)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Successfully wrote data to {file_path}")
        except Exception as e:
            logger.error(f"Error writing JSON to {file_path}: {e}")
            raise IOError(f"Failed to write to {file_path}") from e

    def read_text(self, file_path: str) -> Optional[str]:
        """Reads a text file, returning None if not found."""
        if not os.path.exists(file_path):
            return None
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading text file {file_path}: {e}")
            return None # Or re-raise depending on desired handling

    def write_text(self, file_path: str, content: str):
        """Writes content to a text file."""
        try:
            self._ensure_dir(file_path)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"Successfully wrote text to {file_path}")
        except Exception as e:
            logger.error(f"Error writing text to {file_path}: {e}")
            raise IOError(f"Failed to write to {file_path}") from e

    def list_files(self, dir_path: str, extension: Optional[str] = None) -> List[str]:
        """Lists files in a directory, optionally filtering by extension."""
        if not os.path.isdir(dir_path):
            return []
        try:
            files = []
            for fname in os.listdir(dir_path):
                fpath = os.path.join(dir_path, fname)
                if os.path.isfile(fpath):
                    if extension is None or fname.lower().endswith(extension.lower()):
                        files.append(fname)
            return files
        except Exception as e:
            logger.error(f"Error listing files in {dir_path}: {e}")
            return []

    def read_lines(self, file_path: str) -> List[str]:
        """Reads lines from a text file, stripping whitespace."""
        content = self.read_text(file_path)
        if content is None:
            return []
        return [line.strip() for line in content.splitlines() if line.strip()]

    def write_lines(self, file_path: str, lines: List[str]):
        """Writes a list of strings to a file, one per line."""
        content = "\n".join(lines)
        self.write_text(file_path, content + "\n") # Ensure trailing newline