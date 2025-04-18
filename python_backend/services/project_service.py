# FILE: python_backend/services/project_service.py
# ────────────────────────────────────────────────────────────────────────────
"""
Project‑related operations
==========================

*   Build a recursive **file tree** that honours ignore rules (see *ignoreDirs.txt*).
*   Fetch **file contents in bulk** and attach a *token count* (tiktoken or regex).
*   Provide small utility helpers required by various controllers (drive list, path resolution, …).

The implementation is **pure** (no Flask, no globals) so it can be unit‑tested in isolation
and reused by other frameworks.

**MODIFIED (vNext):** `get_project_tree` now accepts `project_path` to load and apply
                   project-specific exclusions alongside global ones.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional, Set

import pathspec  # git‑wildmatch implementation

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Optional tiktoken – falls back to cheap regex splitter if missing
# ─────────────────────────────────────────────────────────────────────────────
try:
    import tiktoken  # type: ignore

    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:  # pragma: no cover – CI might not have wheels
    _ENC = None
    logger.info("tiktoken unavailable; falling back to regex token counter.")

# ---------------------------------------------------------------------------
# Tunables (override via environment)
# ---------------------------------------------------------------------------
_MAX_TREE_DEPTH: int = int(os.getenv("CTP_MAX_TREE_DEPTH", "50"))
_TOKEN_SIZE_LIMIT: int = int(os.getenv("CTP_TOKEN_SIZE_LIMIT", "2000000"))  # 2 MB


class ProjectService:
    """Stateless helper class – create **one instance per request**."""

    # ------------------------------------------------------------------ init
    def __init__(self, storage_repo: FileStorageRepository, exclusion_service: ExclusionService) -> None:
        self._storage = storage_repo
        self._excl = exclusion_service

    # ────────────────────────────────────────────────────────────────────────
    # 0 · misc helpers
    # ────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _norm(path: str) -> str:
        """Normalise to forward slashes and strip leading "./" or ".\\"."""
        p = os.path.normpath(path).replace("\\", "/")
        if p.startswith("./"):
            p = p[2:]
        return p

    # -------------------------------------------- token counter
    @staticmethod
    def _regex_token_count(text: str) -> int:
        tokens = re.split(r"\s+|([,.;:!?(){}\[\]<>\"'])", text.strip())
        return len([t for t in tokens if t])

    def _token_count(self, text: str) -> int:
        if _ENC is None:
            return self._regex_token_count(text)
        try:
            return len(_ENC.encode(text))
        except Exception:
            return self._regex_token_count(text)

    # public helper used by *token_count_controller*
    def estimate_token_count(self, text: str) -> int:  # noqa: D401 – simple wrapper
        """Return a quick token estimate for *text*."""
        return self._token_count(text)

    # ────────────────────────────────────────────────────────────────────────
    # 1 · project tree – BFS with depth / cycle guards
    # ────────────────────────────────────────────────────────────────────────
    def _expand_simple_pattern(self, p: str) -> List[str]:
        """Expands a simple directory name into patterns matching the dir and its contents."""
        # Avoid expanding wildcard patterns
        if any(ch in p for ch in "*?[]!"):
            return [p]
        # Expand directory names
        return [p.rstrip('/'), f"{p.rstrip('/')}/**"]

    def _make_pathspec(self, patterns: List[str]) -> pathspec.PathSpec:
        """Creates a pathspec object from a list of patterns."""
        cleaned: List[str] = [pat.strip() for pat in patterns if pat.strip()]
        lines: List[str] = []
        for pat in cleaned:
            # pathspec handles wildcards like *.log directly.
            # We only need to expand simple directory names.
            if any(ch in pat for ch in "*?[]!"):
                lines.append(pat)
            else:
                # Assume it's a directory name, expand it
                lines.extend(self._expand_simple_pattern(pat))
        logger.debug(f"Creating pathspec from lines: {lines}")
        return pathspec.PathSpec.from_lines("gitwildmatch", lines)

    def _walk(
        self,
        cur_dir: str,
        base_dir: str,
        spec: pathspec.PathSpec,
        out: List[Dict[str, Any]],
        depth: int = 0,
        visited: Optional[Set[int]] = None,
    ) -> None:
        """Recursive walk function to build the file tree."""
        if visited is None:
            visited = set()
        if depth > _MAX_TREE_DEPTH:
            logger.warning("Max depth (%s) exceeded at %s – pruning", _MAX_TREE_DEPTH, cur_dir)
            return
        try:
            with os.scandir(cur_dir) as it:
                for entry in it:
                    try:
                        # Check if entry path exists and handle potential race conditions or broken links
                        if not os.path.exists(entry.path):
                            logger.debug(f"Skipping non-existent entry: {entry.path}")
                            continue

                        rel_path = self._norm(os.path.relpath(entry.path, base_dir))

                        # Apply pathspec matching
                        if spec.match_file(rel_path):
                            logger.debug(f"Excluding '{rel_path}' based on spec")
                            continue

                        is_dir = entry.is_dir(follow_symlinks=False)
                        node: Dict[str, Any] = {
                            "name": entry.name,
                            "relativePath": rel_path,
                            "absolutePath": self._norm(entry.path),
                            "type": "directory" if is_dir else "file",
                        }

                        if node["type"] == "directory":
                            inode = entry.inode()
                            if inode in visited:
                                logger.debug(f"Skipping visited directory (inode cycle): {entry.path}")
                                continue
                            visited.add(inode)
                            node["children"] = []
                            self._walk(entry.path, base_dir, spec, node["children"], depth + 1, visited)
                            # Prune empty directories after walking children
                            if not node["children"]:
                                continue # Don't add empty directories to the output tree
                        out.append(node)
                    except OSError as e:
                         logger.warning(f"OS error processing entry {entry.name} in {cur_dir}: {e}")
                    except Exception as e:
                         logger.error(f"Unexpected error processing entry {entry.name} in {cur_dir}: {e}")

        except PermissionError:
            logger.warning("Permission denied while scanning %s", cur_dir)
        except FileNotFoundError:
            logger.warning("Directory vanished while scanning: %s", cur_dir)
        except OSError as e:
            logger.error(f"OS error scanning directory {cur_dir}: {e}")


    def get_project_tree(self, root_dir: str) -> List[Dict[str, Any]]:
        """
        Builds the project file tree, applying both global and project-specific exclusions.
        """
        if not root_dir or not os.path.isdir(root_dir):
            raise ValueError("Invalid root directory.")
        root_dir = os.path.abspath(root_dir)

        # Fetch both global and local exclusions
        global_ignore = self._excl.get_global_exclusions()
        local_ignore = self._excl.get_local_exclusions(root_dir) # Pass project path
        combined_ignore = list(set(global_ignore + local_ignore)) # Combine and deduplicate

        logger.info(f"Building tree for '{root_dir}' with combined exclusions: {combined_ignore}")

        # Create pathspec from combined list
        spec = self._make_pathspec(combined_ignore)

        tree: List[Dict[str, Any]] = []
        self._walk(root_dir, root_dir, spec, tree)

        # Sort top-level entries (directories first, then alphabetically)
        tree.sort(key=lambda n: (n["type"] != "directory", n["name"].lower()))
        return tree

    # ────────────────────────────────────────────────────────────────────────
    # 2 · bulk file‑content loader (robust path resolution)
    # ────────────────────────────────────────────────────────────────────────
    def _candidate_paths(self, base_dir: str, raw: str) -> List[str]:
        """Return possible absolute file paths for *raw* given *base_dir*."""
        base_dir_abs = os.path.abspath(base_dir)
        raw_abs = os.path.abspath(raw)
        candidates = [raw_abs]

        # If *raw* is relative, join with base_dir
        if not os.path.isabs(raw):
            candidates.append(os.path.join(base_dir_abs, raw))
        else:
            # *raw* might already include base_dir twice – try trimming
            if raw_abs.startswith(base_dir_abs):
                rel = os.path.relpath(raw_abs, base_dir_abs)
                candidates.append(os.path.join(base_dir_abs, rel))

        # Also try to interpret *raw* relative to CWD (helps in some CI setups)
        candidates.append(os.path.abspath(os.path.join(os.getcwd(), raw)))

        # de‑duplicate while preserving order
        seen: Set[str] = set()
        uniq: List[str] = []
        for c in candidates:
            norm_c = os.path.normpath(c)
            if norm_c not in seen:
                seen.add(norm_c)
                uniq.append(norm_c)
        return uniq

    def get_files_content(self, base_dir: str, relative_paths: List[str]) -> List[Dict[str, Any]]:  # noqa: C901
        if not base_dir or not os.path.isdir(base_dir):
            raise ValueError("Invalid base directory.")
        if not isinstance(relative_paths, list):
            raise ValueError("`paths` must be a list.")

        results: List[Dict[str, Any]] = []
        base_dir_abs = os.path.abspath(base_dir)

        for raw_rel_path in relative_paths:
            norm_rel_path = self._norm(raw_rel_path)
            info: Dict[str, Any] = {
                "path": norm_rel_path,
                "content": "",
                "tokenCount": 0,
            }

            # Construct the expected absolute path based on base_dir and normalized relative path
            expected_abs_path = os.path.normpath(os.path.join(base_dir_abs, norm_rel_path))

            # Check if the expected path exists and is a file
            if os.path.isfile(expected_abs_path):
                chosen = expected_abs_path
            else:
                # Fallback: Check other candidate paths only if the primary one fails
                chosen = None
                for cand in self._candidate_paths(base_dir, raw_rel_path):
                    if os.path.isfile(cand):
                        # Ensure the found candidate is within the base_dir to prevent accessing unintended files
                        if os.path.commonpath([base_dir_abs, cand]) == base_dir_abs:
                             chosen = cand
                             logger.warning(f"Resolved '{raw_rel_path}' to candidate '{chosen}' instead of expected '{expected_abs_path}'")
                             break
                        else:
                             logger.warning(f"Candidate path '{cand}' for '{raw_rel_path}' is outside base directory '{base_dir_abs}'. Skipping.")


            if chosen is None:  # Not found or not a file or outside base_dir
                logger.warning(f"File not found or invalid for relative path: '{norm_rel_path}' (expected: '{expected_abs_path}')")
                info["content"] = f"File not found on server: {norm_rel_path}"
                results.append(info)
                continue

            # --- read file & compute token count --------------------------------
            try:
                # Check file size before reading
                file_size = os.path.getsize(chosen)
                if file_size > _TOKEN_SIZE_LIMIT * 2: # Heuristic: Check raw size against token limit * avg bytes/token
                     logger.warning(f"File '{chosen}' is too large ({file_size} bytes), skipping content read.")
                     info["content"] = f"File too large to process: {norm_rel_path}"
                     info["tokenCount"] = -1 # Indicate skipped due to size
                     results.append(info)
                     continue

                content = self._storage.read_text(chosen)
                if content is None:
                     info["content"] = f"Error reading file content: {norm_rel_path}"
                     logger.error(f"Storage read_text returned None for existing file: {chosen}")
                else:
                    info["content"] = content
                    # Estimate tokens, handle potential large content again if needed
                    if len(content) > _TOKEN_SIZE_LIMIT:
                        info["tokenCount"] = -1 # Mark as too large based on content length
                        logger.warning(f"Content length of '{chosen}' ({len(content)}) exceeds limit ({_TOKEN_SIZE_LIMIT}).")
                    else:
                        info["tokenCount"] = self._token_count(content)

            except Exception as exc:  # pragma: no cover
                logger.error("Error reading %s – %s", chosen, exc)
                info["content"] = f"Error reading file: {norm_rel_path}"
            results.append(info)
        return results


    # ────────────────────────────────────────────────────────────────────────
    # 3 · tiny utilities (unchanged from previous revision)
    # ────────────────────────────────────────────────────────────────────────
    def resolve_folder_path(self, folder_name: str) -> str:
        if not folder_name:
            raise ValueError("folderName cannot be empty.")
        if os.path.isabs(folder_name) and os.path.isdir(folder_name):
            return self._norm(os.path.abspath(folder_name))
        cwd = os.getcwd()
        for up in (cwd, os.path.dirname(cwd), os.path.dirname(os.path.dirname(cwd))):
            candidate = os.path.join(up, folder_name)
            if os.path.isdir(candidate):
                return self._norm(os.path.abspath(candidate))
        # Fallback: try resolving relative to CWD if not found elsewhere
        candidate_cwd = os.path.join(cwd, folder_name)
        if os.path.isdir(candidate_cwd):
             return self._norm(os.path.abspath(candidate_cwd))

        # If still not found, return the normalized absolute path attempt
        # This might point to a non-existent location, caller should handle
        return self._norm(os.path.abspath(folder_name))


    def get_available_drives(self) -> List[Dict[str, str]]:
        drives: List[Dict[str, str]] = []
        if os.name == "nt":
            import string
            from ctypes import windll

            bitmask = windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & (1 << (ord(letter) - ord("A"))):
                    drives.append({"name": f"{letter}:\\", "path": f"{letter}:\\"})
        else:
            drives.append({"name": "/ (Root)", "path": "/"})
            drives.append({"name": "~ (Home)", "path": self._norm(os.path.expanduser("~"))})
            # Add common mount points if they exist
            for mount_point in ["/mnt", "/media"]:
                 if os.path.isdir(mount_point):
                     try:
                         for item in os.listdir(mount_point):
                             item_path = os.path.join(mount_point, item)
                             if os.path.isdir(item_path):
                                 drives.append({"name": f"{mount_point}/{item}", "path": self._norm(item_path)})
                     except OSError as e:
                         logger.warning(f"Could not list directory {mount_point}: {e}")

        # De-duplicate paths just in case
        seen_paths = set()
        unique_drives = []
        for drive in drives:
            if drive["path"] not in seen_paths:
                unique_drives.append(drive)
                seen_paths.add(drive["path"])

        return unique_drives