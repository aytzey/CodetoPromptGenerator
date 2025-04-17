# services/project_service.py
# ────────────────────────────────────────────────────────────────────────────
"""
Project‑related operations:

• Recursive file‑tree that honours ignore patterns in **ignoreDirs.txt**
• Batch file‑content loader with **tiktoken**‑based token counts
• Utility helpers for drive / folder picker

⚡ CPU‑optimisations (2025‑04‑17)
────────────────────────────────
* Skip directory symlinks to avoid infinite loops.
* Track visited inodes to prevent path cycles even without symlinks.
* Hard depth‑limit (env `CTP_MAX_TREE_DEPTH`, default 25).
* Token‑count guard for very large files (env `CTP_TOKEN_SIZE_LIMIT`,
  default 200 000 chars) – returns **‑1** when skipped.

SOLID ✦
-------
* **S**RP – path / token / ignore logic is encapsulated here.
* **O**CP – new ignore rules or tokenisers can be added without touching
  callers.
"""

from __future__ import annotations

import os
import logging
import re
from typing import List, Dict, Any, Optional, Set

import pathspec               # ← gitignore‑style matcher
from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tokeniser initialisation (unchanged)
# ---------------------------------------------------------------------------
try:
    import tiktoken            # type: ignore
    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:              # pragma: no cover
    _ENC = None
    logger.info("tiktoken unavailable – falling back to regex token counter.")

# ---------------------------------------------------------------------------
# Tunables – overridable via environment for power users
# ---------------------------------------------------------------------------
_SAFE_MAX_DEPTH: int = int(os.getenv("CTP_MAX_TREE_DEPTH", "50"))
_TOKEN_COUNT_SIZE_LIMIT: int = int(os.getenv("CTP_TOKEN_SIZE_LIMIT", "2000000"))


class ProjectService:
    """
    High‑level, stateless service class.
    All expensive objects (pathspec, tiktoken encoder) are created once per
    *get_project_tree* call so we keep memory usage low.
    """

    def __init__(
        self,
        storage_repo: FileStorageRepository,
        exclusion_service: ExclusionService,
    ) -> None:
        self._storage_repo = storage_repo
        self._exclusion_service = exclusion_service

    # ────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _norm(path: str) -> str:
        """
        Normalise to forward slashes **without** stripping leading dots.

            ".git"       → **unchanged**
            "./foo/bar"  → "foo/bar"
            ".\\foo\\bar"→ "foo/bar"
        """
        p = os.path.normpath(path).replace("\\", "/")
        if p.startswith("./"):
            p = p[2:]
        return p

    # ------------------------------------------------------------------ .gitignore
    @staticmethod
    def _expand_simple_pattern(p: str) -> List[str]:
        """Expand `"dir"` → `["dir", "dir/**"]` to match dir and its children."""
        return [p, f"{p}/**"]

    def _make_pathspec(self, patterns: List[str]) -> pathspec.PathSpec:
        """Compile ignore patterns into a *gitwildmatch* PathSpec."""
        cleaned = [p.strip() for p in patterns if p.strip()]
        compiled_lines: List[str] = []

        for p in cleaned:
            if any(ch in p for ch in "*?[]!"):        # already a glob
                compiled_lines.append(p)
            else:                                     # plain folder / file
                compiled_lines.extend(self._expand_simple_pattern(p))

        try:
            return pathspec.PathSpec.from_lines("gitwildmatch", compiled_lines)
        except Exception as e:                        # pragma: no cover
            logger.warning("Invalid ignore pattern detected – ignoring it: %s", e)
            return pathspec.PathSpec.from_lines("gitwildmatch", [])

    # ------------------------------------------------------------------ tokeniser
    @staticmethod
    def _regex_token_count(text: str) -> int:
        tokens = re.split(r"\s+|([,.;:!?(){}\[\]<>\"'])", text.strip())
        return len([t for t in tokens if t])

    def _token_count(self, text: str) -> int:
        if _ENC is None:
            return self._regex_token_count(text)
        try:
            return len(_ENC.encode(text))
        except Exception:                      # pragma: no cover
            return self._regex_token_count(text)

    # ────────────────────────────────────────────────────────────────────────
    # Public API – used by controllers
    # ────────────────────────────────────────────────────────────────────────
    # 1. File tree ------------------------------------------------------------
    def _walk(
        self,
        cur_dir: str,
        base_dir: str,
        spec: pathspec.PathSpec,
        out: list[dict],
        depth: int = 0,
        visited_inodes: Optional[Set[int]] = None,
    ) -> None:
        """
        Depth‑first traversal with **cycle & depth guards**.

        * Skips directory symlinks entirely (`follow_symlinks=False`).
        * Keeps a set of visited inode numbers to cut cycles even without
          symlinks (rare but possible on some filesystems).
        """
        if visited_inodes is None:
            visited_inodes = set()

        if depth > _SAFE_MAX_DEPTH:
            logger.warning("Max traversal depth (%s) exceeded at %s – pruning subtree.",
                           _SAFE_MAX_DEPTH, cur_dir)
            return

        try:
            with os.scandir(cur_dir) as scandir_it:
                for entry in scandir_it:
                    rel_path = self._norm(os.path.relpath(entry.path, base_dir))

                    if spec.match_file(rel_path):
                        continue  # Honour global/project ignore rules

                    # Skip directory symlinks – avoids most infinite loops
                    is_dir = entry.is_dir(follow_symlinks=False)
                    if not is_dir and entry.is_symlink():
                        # Treat as regular file; we still include it
                        pass

                    node: Dict[str, Any] = {
                        "name": entry.name,
                        "relativePath": rel_path,
                        "absolutePath": self._norm(entry.path),
                        "type": "directory" if is_dir else "file",
                    }

                    if is_dir:
                        inode = entry.inode()
                        if inode in visited_inodes:
                            logger.debug("Cycle detected – already visited %s (inode %s). Skipping.",
                                         entry.path, inode)
                            continue
                        visited_inodes.add(inode)

                        node["children"] = []
                        self._walk(
                            entry.path,
                            base_dir,
                            spec,
                            node["children"],
                            depth + 1,
                            visited_inodes,
                        )

                    out.append(node)
        except PermissionError:
            logger.warning("Permission denied while reading %s", cur_dir)
        except FileNotFoundError:
            logger.warning("Directory vanished while scanning: %s", cur_dir)
        except Exception as e:                  # pragma: no cover
            logger.error("Error scanning %s – %s", cur_dir, e)

    def get_project_tree(self, root_dir: str) -> List[dict]:
        """Build a recursive tree starting at *root_dir* with safety guards."""
        if not root_dir or not os.path.isdir(root_dir):
            raise ValueError("Invalid root directory.")

        root_dir = os.path.abspath(root_dir)
        patterns = self._exclusion_service.get_global_exclusions()
        spec = self._make_pathspec(patterns)

        tree: List[dict] = []
        self._walk(root_dir, root_dir, spec, tree)

        # sort: dirs first then files, alphabetically
        tree.sort(key=lambda n: (n["type"] != "directory", n["name"].lower()))
        return tree

    # 2. Batch file content ----------------------------------------------------
    def get_files_content(
        self, base_dir: str, relative_paths: List[str]
    ) -> List[Dict[str, Any]]:
        if not base_dir or not os.path.isdir(base_dir):
            raise ValueError("Invalid base directory.")
        if not isinstance(relative_paths, list):
            raise ValueError("`paths` must be a list.")

        base_dir = os.path.abspath(base_dir)
        results: List[Dict[str, Any]] = []

        for rel in relative_paths:
            rel_norm = self._norm(rel)
            full = os.path.join(base_dir, rel_norm)
            file_info = {"path": rel_norm, "content": "", "tokenCount": 0}

            if not os.path.isfile(full):
                file_info["content"] = f"File not found on server: {rel_norm}"
                results.append(file_info)
                continue

            try:
                content = self._storage_repo.read_text(full) or ""
                file_info["content"] = content

                if len(content) > _TOKEN_COUNT_SIZE_LIMIT:
                    # Too big – skip token count to save CPU
                    file_info["tokenCount"] = -1
                    logger.info("Skipping token count for %s (%s chars > limit %s)",
                                rel_norm, len(content), _TOKEN_COUNT_SIZE_LIMIT)
                else:
                    file_info["tokenCount"] = self._token_count(content)
            except Exception as e:              # pragma: no cover
                logger.error("Failed reading %s – %s", full, e)
                file_info["content"] = f"Error reading file: {rel_norm}"

            results.append(file_info)

        return results

    # 3. Utility helpers -------------------------------------------------------
    def get_available_drives(self) -> List[Dict[str, str]]:
        """(unchanged – kept for other controllers if needed)"""
        drives = []
        if os.name == "nt":
            import string
            from ctypes import windll
            bitmask = windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & (1 << (ord(letter) - ord("A"))):
                    drives.append({"name": f"{letter}:\\", "path": f"{letter}:\\"})
        else:
            drives.append({"name": "/ (Root)", "path": "/"})
            home = self._norm(os.path.expanduser("~"))
            drives.append({"name": "~ (Home)", "path": home})
        return drives

    def resolve_folder_path(self, folder_name: str) -> str:
        """(unchanged utility – see previous refactor)"""
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
