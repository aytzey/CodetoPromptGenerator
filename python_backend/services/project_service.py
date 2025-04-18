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
                lines.extend(self._expand_simple_pattern(pat))
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
                    rel_path = self._norm(os.path.relpath(entry.path, base_dir))
                    if spec.match_file(rel_path):
                        continue

                    node: Dict[str, Any] = {
                        "name": entry.name,
                        "relativePath": rel_path,
                        "absolutePath": self._norm(entry.path),
                        "type": "directory" if entry.is_dir(follow_symlinks=False) else "file",
                    }

                    if node["type"] == "directory":
                        inode = entry.inode()
                        if inode in visited:
                            continue
                        visited.add(inode)
                        node["children"] = []
                        self._walk(entry.path, base_dir, spec, node["children"], depth + 1, visited)
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
            if c not in seen:
                seen.add(c)
                uniq.append(c)
        return uniq

    def get_files_content(self, base_dir: str, relative_paths: List[str]) -> List[Dict[str, Any]]:  # noqa: C901
        if not base_dir or not os.path.isdir(base_dir):
            raise ValueError("Invalid base directory.")
        if not isinstance(relative_paths, list):
            raise ValueError("`paths` must be a list.")

        results: List[Dict[str, Any]] = []
        for raw in relative_paths:
            info: Dict[str, Any] = {
                "path": self._norm(raw),
                "content": "",
                "tokenCount": 0,
            }

            chosen: Optional[str] = None
            for cand in self._candidate_paths(base_dir, raw):
                if os.path.isfile(cand):
                    chosen = cand
                    break

            if chosen is None:  # Not found at all
                info["content"] = f"File not found on server: {raw}"
                results.append(info)
                continue

            # --- read file & compute token count --------------------------------
            try:
                content = self._storage.read_text(chosen) or ""
                info["content"] = content
                if len(content) > _TOKEN_SIZE_LIMIT:
                    info["tokenCount"] = -1
                else:
                    info["tokenCount"] = self._token_count(content)
            except Exception as exc:  # pragma: no cover
                logger.error("Error reading %s – %s", chosen, exc)
                info["content"] = f"Error reading file: {raw}"
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
        return drives
