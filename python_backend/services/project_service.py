# python_backend/services/project_service.py
# ────────────────────────────────────────────────────────────────────────────
"""
Project‑related operations
==========================

*   Build a recursive **file tree** that honours ignore rules (see *ignoreDirs.txt*).
*   Fetch **file contents in bulk** and attach a *token count* (tiktoken or regex).
*   Provide small utility helpers required by various controllers (drive list, path resolution, …).

The implementation is **pure** (no Flask, no globals) so it can be unit‑tested in isolation
and reused by other frameworks.

FIX (2025-04-18): Improved path resolution in `get_files_content` and `_candidate_paths`
                  to correctly handle relative paths provided by clients like autotest.js.
                  Added more robust normalization and logging.
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
# Increased limit slightly, check byte size instead of char length
_TOKEN_SIZE_LIMIT: int = int(os.getenv("CTP_TOKEN_SIZE_LIMIT_BYTES", "4000000"))  # 4 MB


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
        # Use os.path.normpath for OS-specific normalization (e.g., collapsing ..)
        # Then replace backslashes for consistency if needed, though join/isfile should handle OS paths.
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
    # 1 · project tree – BFS with depth / cycle guards (unchanged)
    # ────────────────────────────────────────────────────────────────────────
    def _expand_simple_pattern(self, p: str) -> List[str]:
        return [p, f"{p}/**"]

    def _make_pathspec(self, patterns: List[str]) -> pathspec.PathSpec:
        cleaned: List[str] = [pat.strip() for pat in patterns if pat.strip()]
        lines: List[str] = []
        for pat in cleaned:
            if any(ch in pat for ch in "*?[]!"):
                lines.append(pat)
            else:
                # Ensure directory patterns match contents correctly
                pat_norm = pat.replace("\\", "/")
                if not pat_norm.endswith('/'):
                     lines.extend([pat_norm, f"{pat_norm}/**"])
                else:
                     lines.extend([pat_norm[:-1], f"{pat_norm}**"])

        logger.debug(f"Pathspec lines from patterns {patterns}: {lines}")
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
        if visited is None:
            visited = set()
        if depth > _MAX_TREE_DEPTH:
            logger.warning("Max depth (%s) exceeded at %s – pruning", _MAX_TREE_DEPTH, cur_dir)
            return
        try:
            with os.scandir(cur_dir) as it:
                for entry in it:
                    # Use normpath for matching, but keep original relative path for display/API
                    match_path = os.path.normpath(os.path.relpath(entry.path, base_dir)).replace("\\", "/")
                    if spec.match_file(match_path):
                        logger.debug(f"Excluding '{match_path}' due to spec match.")
                        continue

                    # Use normalized path for API consistency
                    rel_path_api = self._norm(os.path.relpath(entry.path, base_dir))

                    node: Dict[str, Any] = {
                        "name": entry.name,
                        "relativePath": rel_path_api, # Use normalized path for API
                        "absolutePath": self._norm(entry.path), # Normalize absolute path too
                        "type": "directory" if entry.is_dir(follow_symlinks=False) else "file",
                    }

                    if node["type"] == "directory":
                        inode = entry.inode()
                        if inode in visited:
                            logger.debug(f"Skipping visited directory inode {inode} at {entry.path}")
                            continue
                        visited.add(inode)
                        node["children"] = []
                        self._walk(entry.path, base_dir, spec, node["children"], depth + 1, visited)
                        # Only keep directory node if it has children after filtering (optional, depends on desired behavior)
                        # if not node["children"]:
                        #     continue
                    out.append(node)
        except PermissionError:
            logger.debug("Permission denied while scanning %s", cur_dir)
        except FileNotFoundError:
            logger.debug("Directory vanished while scanning: %s", cur_dir)

    def get_project_tree(self, root_dir: str) -> List[Dict[str, Any]]:
        if not root_dir or not os.path.isdir(root_dir):
            raise ValueError("Invalid root directory.")
        root_dir = os.path.abspath(root_dir)
        ignore = self._excl.get_global_exclusions()
        spec = self._make_pathspec(ignore)
        tree: List[Dict[str, Any]] = []
        self._walk(root_dir, root_dir, spec, tree)
        tree.sort(key=lambda n: (n["type"] != "directory", n["name"].lower()))
        return tree

    # ────────────────────────────────────────────────────────────────────────
    # 2 · bulk file‑content loader (robust path resolution) - REVISED
    # ────────────────────────────────────────────────────────────────────────
    def _candidate_paths(self, base_dir: str, raw_relative_path: str) -> List[str]:
        """
        Generate and return potential absolute file paths for a given raw relative path
        relative to a base directory. Prioritizes the path relative to base_dir.
        Returns normalized, absolute paths.
        """
        candidates: List[str] = []
        base_dir_abs = os.path.abspath(base_dir)

        # 1. Primary candidate: path relative to base_dir
        # Ensure raw_relative_path is treated as relative even if it starts with '/' on Unix
        # os.path.join handles this correctly.
        expected_path = os.path.join(base_dir_abs, raw_relative_path)
        candidates.append(expected_path)

        # 2. Fallback: path relative to CWD (less reliable, but might help in edge cases)
        #    Only add if it's different from the expected path after normalization.
        try:
            # Use abspath which resolves relative to CWD
            cwd_path = os.path.abspath(raw_relative_path)
            if os.path.normpath(cwd_path) != os.path.normpath(expected_path):
                candidates.append(cwd_path)
        except Exception as e:
            logger.debug(f"Could not resolve path relative to CWD for '{raw_relative_path}': {e}")


        # Normalize, deduplicate, and preserve order
        seen: Set[str] = set()
        uniq: List[str] = []
        for c in candidates:
            try:
                # Use abspath again to resolve any '..' etc. and normpath for consistent comparisons
                norm_c = os.path.normpath(os.path.abspath(c))
                if norm_c not in seen:
                    seen.add(norm_c)
                    uniq.append(norm_c) # Store the normalized absolute path
            except Exception as e:
                 logger.debug(f"Could not normalize candidate path '{c}': {e}")


        logger.debug(f"Candidates for base='{base_dir}', raw='{raw_relative_path}': {uniq}")
        return uniq

    def get_files_content(self, base_dir: str, relative_paths: List[str]) -> List[Dict[str, Any]]:  # noqa: C901
        if not base_dir or not os.path.isdir(base_dir):
            raise ValueError("Invalid base directory.")
        if not isinstance(relative_paths, list):
            raise ValueError("`paths` must be a list.")

        results: List[Dict[str, Any]] = []
        for raw_rel_path in relative_paths:
            # Use normalized relative path for the result dict key, but keep original for error messages
            norm_rel_path = self._norm(raw_rel_path)
            info: Dict[str, Any] = {
                "path": norm_rel_path,
                "content": "",
                "tokenCount": 0,
            }

            chosen_abs_path: Optional[str] = None
            # Get normalized, absolute candidate paths
            candidates = self._candidate_paths(base_dir, raw_rel_path)
            for cand_abs_path in candidates:
                # Check if the candidate path exists and is a file
                try:
                    if os.path.isfile(cand_abs_path):
                        chosen_abs_path = cand_abs_path
                        logger.debug(f"Found file for '{raw_rel_path}' at candidate: {chosen_abs_path}")
                        break
                    else:
                        logger.debug(f"Candidate path is not a file or does not exist: {cand_abs_path}")
                except Exception as e:
                     logger.debug(f"Error checking file status for candidate '{cand_abs_path}': {e}")


            if chosen_abs_path is None:  # Not found at all
                logger.warning(f"File not found for '{raw_rel_path}'. Tried candidates: {candidates}")
                # Use original raw path in error message for clarity
                info["content"] = f"File not found on server: {raw_rel_path}"
                results.append(info)
                continue

            # --- read file & compute token count --------------------------------
            try:
                # Use the chosen absolute path to read
                content = self._storage.read_text(chosen_abs_path)
                if content is None:
                     # Should not happen if isfile passed, but handle defensively
                     logger.error(f"File '{chosen_abs_path}' confirmed by isfile but read_text returned None.")
                     info["content"] = f"Error reading file (read None): {raw_rel_path}"
                     results.append(info)
                     continue

                info["content"] = content
                # Check byte size for limit
                byte_size = len(content.encode('utf-8', errors='ignore'))
                if byte_size > _TOKEN_SIZE_LIMIT:
                    logger.warning(f"File '{chosen_abs_path}' ({byte_size} bytes) exceeds size limit ({_TOKEN_SIZE_LIMIT} bytes). Token count set to -1.")
                    info["tokenCount"] = -1
                else:
                    info["tokenCount"] = self._token_count(content)

            except Exception as exc:  # pragma: no cover
                logger.error("Error reading %s – %s", chosen_abs_path, exc)
                info["content"] = f"Error reading file: {raw_rel_path}" # Use original raw path in error message
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
        # Check relative to CWD, parent of CWD, grandparent of CWD
        for base in (cwd, os.path.dirname(cwd), os.path.dirname(os.path.dirname(cwd))):
            candidate = os.path.join(base, folder_name)
            try:
                if os.path.isdir(candidate):
                    return self._norm(os.path.abspath(candidate))
            except Exception: # Catch potential errors from os.path.isdir like permission issues
                continue

        # If not found relative to CWD hierarchy, treat as potentially relative to project root or just return absolute
        # This part might need adjustment based on where the backend is expected to run relative to projects
        # For now, just return the normalized absolute path based on CWD as a last resort
        logger.warning(f"Could not resolve '{folder_name}' relative to CWD hierarchy. Returning absolute path based on CWD.")
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
            # Use pathlib for home dir for better cross-platform compatibility
            from pathlib import Path
            try:
                 home_dir = str(Path.home())
                 drives.append({"name": "~ (Home)", "path": self._norm(home_dir)})
            except Exception as e:
                 logger.warning(f"Could not determine home directory: {e}")

            # Check common mount points
            for mount_point in ["/mnt", "/media"]:
                 if os.path.isdir(mount_point):
                     try:
                         for item in os.listdir(mount_point):
                             item_path = os.path.join(mount_point, item)
                             if os.path.isdir(item_path):
                                 drives.append({"name": f"{mount_point}/{item}", "path": self._norm(item_path)})
                     except PermissionError:
                         logger.warning(f"Permission denied accessing {mount_point}")
                     except Exception as e:
                          logger.warning(f"Error listing directories in {mount_point}: {e}")

        # De-duplicate drives based on normalized path
        seen_paths = set()
        unique_drives = []
        for drive in drives:
            norm_path = os.path.normpath(drive["path"])
            if norm_path not in seen_paths:
                seen_paths.add(norm_path)
                unique_drives.append(drive)

        return unique_drives