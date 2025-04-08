# File: python_backend/services/project_service.py
# REFACTOR bestehendes File / OVERWRITE existing file
import os
import logging
import re
from typing import List, Dict, Any, Optional
from repositories.file_storage import FileStorageRepository # Assuming you have this

logger = logging.getLogger(__name__)

class ProjectService:
    """Service layer for project-related operations like file tree and content fetching."""

    def __init__(self, storage_repo: FileStorageRepository, exclusion_service):
        # Inject dependencies if needed, e.g., for reading ignore files
        self.storage_repo = storage_repo
        self.exclusion_service = exclusion_service # Inject exclusion service

    def _unify_slashes(self, path: str) -> str:
        """Converts backslashes to forward slashes."""
        return path.replace('\\', '/')

    def _is_excluded(self, relative_path: str, ignored_items: List[str]) -> bool:
        """Checks if a relative path matches any ignored patterns (simple segment check)."""
        # Normalize path and ignored items
        norm_path = self._unify_slashes(relative_path).strip('/')
        norm_ignored = [self._unify_slashes(item).strip('/') for item in ignored_items]
        segments = set(norm_path.split('/'))
        
        # Check if any segment exactly matches an ignored item or starts with it + '/'
        # More sophisticated matching (like .gitignore patterns) could be added here
        for ignored in norm_ignored:
             if ignored in segments:
                 return True
             # Check parent directory exclusion like 'node_modules/' check
             if any(seg.startswith(ignored + '/') for seg in norm_path.split('/')):
                 return True
             # Check if the path itself is exactly ignored
             if norm_path == ignored:
                 return True
             # Check if the path starts with an ignored directory
             if norm_path.startswith(ignored + '/'):
                 return True

        return False


    def build_file_tree(self, current_dir: str, base_dir: str, ignored_items: List[str]) -> List[Dict[str, Any]]:
        """
        Recursively builds the file tree structure for a directory.
        Uses the injected exclusion service to get ignored items.
        """
        items = []
        try:
            for entry in os.scandir(current_dir):
                full_path = self._unify_slashes(entry.path)
                relative_path = self._unify_slashes(os.path.relpath(full_path, base_dir))

                # Use the improved _is_excluded check
                if self._is_excluded(relative_path, ignored_items):
                    continue

                node: Dict[str, Any] = {
                    'name': entry.name,
                    'relativePath': relative_path,
                    'absolutePath': full_path, # Keep absolute path
                    'type': 'directory' if entry.is_dir() else 'file'
                }

                if entry.is_dir():
                    try:
                        # Recursive call for subdirectories
                        node['children'] = self.build_file_tree(entry.path, base_dir, ignored_items)
                        # Only include directories if they are not empty after exclusion? Optional.
                        # if node['children']:
                        #    items.append(node)
                        items.append(node) # Include empty dirs for now
                    except PermissionError:
                        logger.warning(f"Permission denied accessing directory: {entry.path}")
                    except Exception as e:
                        logger.error(f"Error processing directory {entry.path}: {e}")
                else:
                     # It's a file
                    items.append(node)

        except PermissionError:
            logger.warning(f"Permission denied accessing directory: {current_dir}")
        except FileNotFoundError:
             logger.warning(f"Directory not found during scan: {current_dir}")
        except Exception as e:
            logger.error(f"Error scanning directory {current_dir}: {e}")

        # Sort items: directories first, then files, alphabetically
        items.sort(key=lambda x: (x['type'] != 'directory', x['name'].lower()))
        return items

    def get_project_tree(self, root_dir: str) -> List[Dict[str, Any]]:
        """
        Gets the file tree for the given root directory, respecting global exclusions.
        """
        if not root_dir or not os.path.isdir(root_dir):
            raise ValueError("Invalid root directory provided.")

        abs_root_dir = self._unify_slashes(os.path.abspath(root_dir))
        global_exclusions = self.exclusion_service.get_global_exclusions()

        logger.info(f"Building tree for {abs_root_dir} with exclusions: {global_exclusions}")
        tree = self.build_file_tree(abs_root_dir, abs_root_dir, global_exclusions)
        return tree

    def estimate_token_count(self, text: str) -> int:
        """Estimates token count using a simple regex split."""
        if not isinstance(text, str):
            return 0
        # Simple split on whitespace and common punctuation
        tokens = re.split(r"\s+|([,.;:!?(){}[\]<>\"'])", text.strip())
        # Filter out empty strings resulting from the split
        tokens = [t for t in tokens if t]
        return len(tokens)


    def get_files_content(self, base_dir: str, relative_paths: List[str]) -> List[Dict[str, Any]]:
        """Reads content and estimates tokens for a list of relative file paths."""
        if not base_dir or not os.path.isdir(base_dir):
             raise ValueError("Invalid base directory provided.")
        if not isinstance(relative_paths, list):
            raise ValueError("Relative paths must be a list.")

        abs_base_dir = self._unify_slashes(os.path.abspath(base_dir))
        results = []

        for rel_path in relative_paths:
            norm_rel_path = self._unify_slashes(rel_path)
            full_path = os.path.join(abs_base_dir, norm_rel_path)
            file_data = {'path': norm_rel_path, 'content': '', 'tokenCount': 0}

            if not os.path.isfile(full_path):
                logger.warning(f"File not found: {full_path}")
                file_data['content'] = f"File not found on server: {norm_rel_path}"
            else:
                try:
                    # Use storage repo to read text
                    content = self.storage_repo.read_text(full_path)
                    if content is not None:
                        file_data['content'] = content
                        file_data['tokenCount'] = self.estimate_token_count(content)
                    else:
                         # read_text failed (logged internally)
                         file_data['content'] = f"Error reading file: {norm_rel_path}"
                except Exception as e:
                     # Catch any unexpected errors during read/tokenization
                    logger.error(f"Unexpected error processing file {full_path}: {e}")
                    file_data['content'] = f"Error reading file: {norm_rel_path}"

            results.append(file_data)
        return results

    def get_folder_browse_info(self, target_path: str) -> Dict[str, Any]:
        """ Gets browse information (folders, current path, parent path) for a directory."""
        abs_path = self._unify_slashes(os.path.abspath(target_path))

        if not os.path.isdir(abs_path):
            raise FileNotFoundError(f"Path does not exist or is not a directory: {abs_path}")

        parent_path = os.path.dirname(abs_path)
        # Prevent going above root (e.g., '/' or 'C:\')
        is_root = parent_path == abs_path
        parent_info = None if is_root else self._unify_slashes(parent_path)

        folders = []
        try:
            for item in os.listdir(abs_path):
                item_path = os.path.join(abs_path, item)
                if os.path.isdir(item_path):
                    # Basic permission check before adding
                    if os.access(item_path, os.R_OK):
                        folders.append({
                            'name': item,
                            'path': self._unify_slashes(item_path)
                        })
                    else:
                         logger.warning(f"Permission denied for subfolder: {item_path}")

            folders.sort(key=lambda x: x['name'].lower())

        except PermissionError:
            logger.error(f"Permission denied accessing: {abs_path}")
            # Re-raise or handle as needed; here re-raising specific error
            raise PermissionError(f"Permission denied to access: {abs_path}")
        except Exception as e:
            logger.error(f"Error listing folders in {abs_path}: {e}")
            raise # Re-raise other unexpected errors

        return {
            'current_path': abs_path,
            'parent_path': parent_info,
            'folders': folders
        }

    def get_available_drives(self) -> List[Dict[str, str]]:
        """ Gets available drives (Windows) or common roots (Unix-like)."""
        drives = []
        if os.name == 'nt':
            # Windows drive detection
            import string
            from ctypes import windll
            bitmask = windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & (1 << (ord(letter) - ord('A'))):
                    drive_path = f"{letter}:\\"
                    # Check if drive is actually accessible before adding? Optional.
                    # if os.path.exists(drive_path):
                    drives.append({'name': f"Drive {letter}:", 'path': self._unify_slashes(drive_path)})
        else:
            # Unix-like systems
            drives.append({'name': '/ (Root)', 'path': '/'})
            home_dir = self._unify_slashes(os.path.expanduser('~'))
            drives.append({'name': f"~ (Home)", 'path': home_dir})
            # Add common user folders if they exist and are readable
            for folder in ['Desktop', 'Documents', 'Downloads', 'Projects']:
                path = os.path.join(home_dir, folder)
                if os.path.isdir(path) and os.access(path, os.R_OK):
                     drives.append({'name': folder, 'path': self._unify_slashes(path)})

        return drives

    def resolve_folder_path(self, folder_name: str) -> str:
        """Attempts to resolve a relative folder name against common base paths."""
        if not folder_name:
            raise ValueError("Folder name cannot be empty.")

        # Prioritize absolute path if given
        if os.path.isabs(folder_name) and os.path.isdir(folder_name):
            return self._unify_slashes(os.path.abspath(folder_name))

        # Try relative to current working directory and its parents
        cwd = os.getcwd()
        possible_bases = [
            cwd,
            os.path.abspath(os.path.join(cwd, '..')),
            os.path.abspath(os.path.join(cwd, '..', '..'))
        ]

        for base in possible_bases:
            candidate = os.path.join(base, folder_name)
            if os.path.isdir(candidate):
                logger.info(f"Resolved '{folder_name}' relative to '{base}' -> '{candidate}'")
                return self._unify_slashes(os.path.abspath(candidate))

        # If not found relatively, return the absolute version of the input
        # (even if it doesn't exist, let downstream handle it)
        logger.warning(f"Could not resolve '{folder_name}' relatively, returning absolute path.")
        return self._unify_slashes(os.path.abspath(folder_name))