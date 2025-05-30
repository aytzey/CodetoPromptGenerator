# File: python_backend/repositories/file_storage.py
import os
import json
import logging
from typing import List, Any, Optional

logger = logging.getLogger(__name__)


class FileStorageRepository:
    """Utility class for safe read/write operations on the local file-system."""

    # --------------------------------------------------------------------- #
    # ---------------------------  UTILITIES  ----------------------------- #
    # --------------------------------------------------------------------- #
    @staticmethod
    def _ensure_dir(file_path: str) -> None:
        """
        Guarantee the parent directory of *file_path* exists.

        Raises
        ------
        PermissionError
            If the process lacks permissions to create the directory.
        OSError
            For any other OS-level error.
        """
        dir_name: str = os.path.dirname(os.path.abspath(file_path))
        if not dir_name:  # File in CWD – nothing to create.
            return
        try:
            os.makedirs(dir_name, exist_ok=True)
        except PermissionError as exc:
            logger.error("Permission denied while creating directory '%s': %s",
                         dir_name, exc)
            raise
        except OSError as exc:
            logger.error("OS error while creating directory '%s': %s",
                         dir_name, exc)
            raise

    @staticmethod
    def file_exists(file_path: str) -> bool:
        """Return *True* if *file_path* exists and is a file."""
        return os.path.isfile(file_path)

    # --------------------------------------------------------------------- #
    # ---------------------------  JSON I/O  ------------------------------ #
    # --------------------------------------------------------------------- #
    def read_json(self, file_path: str, default: Any = None) -> Any:
        """
        Safely load JSON from *file_path*.

        Returns *default* if the file cannot be read or parsed.
        """
        if not self.file_exists(file_path):
            logger.debug("JSON read skipped – file '%s' not found.", file_path)
            return default

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning("JSON read failed – file '%s' vanished mid-operation.",
                           file_path)
        except PermissionError as exc:
            logger.error("Permission denied when reading JSON '%s': %s",
                         file_path, exc)
        except json.JSONDecodeError as exc:
            logger.error("Malformed JSON in '%s': %s", file_path, exc)
        except OSError as exc:
            logger.error("OS error reading JSON '%s': %s", file_path, exc)
        return default

    def write_json(self, file_path: str, data: Any) -> None:
        """
        Atomically dump *data* to *file_path* in JSON format.

        Raises
        ------
        IOError
            When writing fails for any reason.
        """
        try:
            self._ensure_dir(file_path)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info("Wrote JSON to '%s' successfully.", file_path)
        except Exception as exc:  # noqa: BLE001  – convert to IOError
            logger.error("Failed to write JSON to '%s': %s", file_path, exc)
            raise IOError(f"Failed to write JSON to '{file_path}'") from exc

    # --------------------------------------------------------------------- #
    # ---------------------------  TEXT I/O  ------------------------------ #
    # --------------------------------------------------------------------- #
    def read_text(self, file_path: str) -> Optional[str]:
        """
        Return file contents or *None* on failure.
        """
        if not self.file_exists(file_path):
            logger.debug("Text read skipped – file '%s' not found.", file_path)
            return None
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("Text read failed – file '%s' vanished mid-operation.",
                           file_path)
        except PermissionError as exc:
            logger.error("Permission denied when reading text '%s': %s",
                         file_path, exc)
        except OSError as exc:
            logger.error("OS error reading text '%s': %s", file_path, exc)
        return None

    def write_text(self, file_path: str, content: str) -> None:
        """
        Write *content* to *file_path*.

        Raises
        ------
        IOError
            When writing fails.
        """
        try:
            self._ensure_dir(file_path)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            logger.info("Wrote text to '%s' successfully.", file_path)
        except Exception as exc:
            logger.error("Failed to write text to '%s': %s", file_path, exc)
            raise IOError(f"Failed to write text to '{file_path}'") from exc

    # --------------------------------------------------------------------- #
    # --------------------------  BINARY I/O  ----------------------------- #
    # --------------------------------------------------------------------- #
    def read_bytes(self, file_path: str) -> Optional[bytes]:
        """
        Read raw bytes from *file_path*.

        Returns *None* if the file cannot be read.
        """
        if not self.file_exists(file_path):
            logger.debug("Binary read skipped – file '%s' not found.", file_path)
            return None
        try:
            with open(file_path, "rb") as f:
                return f.read()
        except FileNotFoundError:
            logger.warning("Binary read failed – file '%s' vanished mid-operation.",
                           file_path)
        except PermissionError as exc:
            logger.error("Permission denied when reading binary '%s': %s",
                         file_path, exc)
        except OSError as exc:
            logger.error("OS error reading binary '%s': %s", file_path, exc)
        return None

    def write_bytes(self, file_path: str, data: bytes) -> None:
        """
        Write raw *data* to *file_path*.

        Raises
        ------
        IOError
            When writing fails.
        """
        try:
            self._ensure_dir(file_path)
            with open(file_path, "wb") as f:
                f.write(data)
            logger.info("Wrote binary data to '%s' successfully.", file_path)
        except Exception as exc:
            logger.error("Failed to write binary data to '%s': %s",
                         file_path, exc)
            raise IOError(f"Failed to write binary data to '{file_path}'") from exc

    # --------------------------------------------------------------------- #
    # --------------------------  LINE HELPERS  --------------------------- #
    # --------------------------------------------------------------------- #
    def read_lines(self, file_path: str) -> List[str]:
        """
        Read a text file and return a list of stripped, non-empty lines.
        """
        try:
            content = self.read_text(file_path)
            if content is None:
                return []
            return [line.strip() for line in content.splitlines() if line.strip()]
        except Exception as exc:  # Should be very rare due to read_text guards
            logger.error("Unexpected error reading lines from '%s': %s",
                         file_path, exc)
            return []

    def write_lines(self, file_path: str, lines: List[str]) -> None:
        """
        Serialize *lines* to *file_path*, ensuring a trailing newline.
        """
        self.write_text(file_path, "\n".join(lines) + "\n")

    # --------------------------------------------------------------------- #
    # --------------------------  DIRECTORY HELPERS  ---------------------- #
    # --------------------------------------------------------------------- #
    def list_files(self, dir_path: str, extension: Optional[str] = None) -> List[str]:
        """
        Return a list of file names in *dir_path* filtered by *extension*.

        The *extension* parameter is matched case-insensitively.
        """
        if not os.path.isdir(dir_path):
            logger.debug("Directory '%s' does not exist. Returning empty list.",
                         dir_path)
            return []

        try:
            result: List[str] = []
            for entry in os.listdir(dir_path):
                full = os.path.join(dir_path, entry)
                if os.path.isfile(full):
                    if extension is None or entry.lower().endswith(extension.lower()):
                        result.append(entry)
            return result
        except PermissionError as exc:
            logger.error("Permission denied when listing '%s': %s", dir_path, exc)
        except OSError as exc:
            logger.error("OS error when listing '%s': %s", dir_path, exc)
        return []
