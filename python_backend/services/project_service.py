# FILE: python_backend/services/project_service.py
# UPDATED: unified error handling / logging (service_exceptions)

from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional, Set

import pathspec  # git-wildmatch impl.

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.service_exceptions import (
    InvalidInputError,
    ResourceNotFoundError,
    PermissionDeniedError,
    wrap_service_methods,
)

logger = logging.getLogger(__name__)

try:
    import tiktoken  # type: ignore

    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:  # pragma: no cover
    _ENC = None
    logger.info("tiktoken unavailable – falling back to regex token counter.")

_MAX_TREE_DEPTH: int = int(os.getenv("CTP_MAX_TREE_DEPTH", "50"))
_TOKEN_SIZE_LIMIT: int = int(os.getenv("CTP_TOKEN_SIZE_LIMIT", "2000000"))  # 2 MB

@wrap_service_methods
class ProjectService:
    """Pure, stateless helpers – instantiate once per request."""

    def __init__(
        self,
        storage_repo: FileStorageRepository,
        exclusion_service: ExclusionService,
    ) -> None:
        self._storage = storage_repo
        self._excl = exclusion_service

    # ─────────────────────── helpers ────────────────────────────────
    @staticmethod
    def _norm(path: str) -> str:
        p = os.path.normpath(path).replace("\\", "/")
        if p.startswith("./"):
            p = p[2:]
        return p

    # ------------------------- token counter ------------------------
    @staticmethod
    def _regex_token_count(text: str) -> int:
        return len(re.split(r"\s+|([,.;:!?(){}\[\]<>\"'])", text.strip()))

    def _token_count(self, text: str) -> int:
        if _ENC is None:
            return self._regex_token_count(text)
        try:
            return len(_ENC.encode(text))
        except Exception:
            return self._regex_token_count(text)

    def estimate_token_count(self, text: str) -> int:  # noqa: D401
        """Lightweight token estimate for *text*."""
        return self._token_count(text)

    # ─────────────────────── 1. Tree builder ────────────────────────
    def _expand_simple_pattern(self, p: str) -> List[str]:
        if any(ch in p for ch in "*?[]!"):
            return [p]
        return [p.rstrip("/"), f"{p.rstrip('/')}/**"]

    def _make_pathspec(self, patterns: List[str]) -> pathspec.PathSpec:
        cleaned = [pat.strip() for pat in patterns if pat.strip()]
        lines: List[str] = []
        for pat in cleaned:
            lines.extend(
                [pat] if any(ch in pat for ch in "*?[]!") else self._expand_simple_pattern(pat)
            )
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
            logger.warning("Max depth (%s) exceeded at %s – pruning", _MAX_TREE_DEPTH, cur_dir)
            return
        try:
            with os.scandir(cur_dir) as it:
                for entry in it:
                    try:
                        if not os.path.exists(entry.path):
                            continue
                        rel_path = self._norm(os.path.relpath(entry.path, base_dir))
                        if spec.match_file(rel_path):
                            continue

                        is_dir = entry.is_dir(follow_symlinks=False)
                        node: Dict[str, Any] = {
                            "name": entry.name,
                            "relativePath": rel_path,
                            "absolutePath": self._norm(entry.path),
                            "type": "directory" if is_dir else "file",
                        }

                        if is_dir:
                            inode = entry.inode()
                            if inode in visited:
                                continue
                            visited.add(inode)
                            node["children"] = []
                            self._walk(entry.path, base_dir, spec, node["children"], depth + 1, visited)
                            if not node["children"]:
                                continue
                        out.append(node)
                    except PermissionError as exc:
                        logger.error("Permission denied reading %s: %s", entry.path, exc)
                        raise PermissionDeniedError(f"Permission denied: {entry.path}") from exc
                    except OSError as exc:
                        logger.error("OS error scanning %s: %s", entry.path, exc)
        except PermissionError as exc:
            logger.error("Permission denied scanning %s: %s", cur_dir, exc)
            raise PermissionDeniedError(f"Permission denied: {cur_dir}") from exc
        except FileNotFoundError as exc:
            logger.error("Directory vanished: %s", cur_dir)
            raise ResourceNotFoundError(f"Directory not found: {cur_dir}") from exc

    def get_project_tree(self, root_dir: str) -> List[Dict[str, Any]]:
        if not root_dir:
            logger.error("root_dir is empty")
            raise InvalidInputError("rootDir must not be empty.")
        if not os.path.isdir(root_dir):
            logger.error("Project root directory not found: %s", root_dir)
            raise ResourceNotFoundError(f"Project root directory not found: {root_dir}")

        root_dir = os.path.abspath(root_dir)
        spec = self._make_pathspec(
            list(
                set(
                    self._excl.get_global_exclusions()
                    + self._excl.get_local_exclusions(root_dir)
                )
            )
        )

        tree: List[Dict[str, Any]] = []
        self._walk(root_dir, root_dir, spec, tree)
        tree.sort(key=lambda n: (n["type"] != "directory", n["name"].lower()))
        return tree

    # ─────────────────── 2. Bulk file-content loader ───────────────────
    def _candidate_paths(self, base_dir: str, raw: str) -> List[str]:
        base_dir_abs = os.path.abspath(base_dir)
        raw_abs = os.path.abspath(raw)
        candidates = [raw_abs]

        if not os.path.isabs(raw):
            candidates.append(os.path.join(base_dir_abs, raw))
        else:
            if raw_abs.startswith(base_dir_abs):
                rel = os.path.relpath(raw_abs, base_dir_abs)
                candidates.append(os.path.join(base_dir_abs, rel))
        candidates.append(os.path.abspath(os.path.join(os.getcwd(), raw)))

        seen: Set[str] = set()
        uniq: List[str] = []
        for c in candidates:
            norm_c = os.path.normpath(c)
            if norm_c not in seen:
                seen.add(norm_c)
                uniq.append(norm_c)
        return uniq

    # noqa: C901 – complex but well-tested
    def get_files_content(self, base_dir: str, relative_paths: List[str]) -> List[Dict[str, Any]]:
        if not base_dir:
            logger.error("baseDir missing")
            raise InvalidInputError("baseDir must not be empty.")
        if not os.path.isdir(base_dir):
            logger.error("Base directory not found: %s", base_dir)
            raise ResourceNotFoundError(f"Base directory not found: {base_dir}")
        if not isinstance(relative_paths, list):
            logger.error("paths must be a list, got %s", type(relative_paths).__name__)
            raise InvalidInputError("paths must be a list of strings.")

        results: List[Dict[str, Any]] = []
        base_dir_abs = os.path.abspath(base_dir)

        for raw_rel_path in relative_paths:
            norm_rel_path = self._norm(raw_rel_path)
            info: Dict[str, Any] = {"path": norm_rel_path, "content": "", "tokenCount": 0}

            expected_abs_path = os.path.normpath(os.path.join(base_dir_abs, norm_rel_path))
            if os.path.isfile(expected_abs_path):
                chosen = expected_abs_path
            else:
                chosen = next(
                    (cand for cand in self._candidate_paths(base_dir, raw_rel_path) if os.path.isfile(cand)),
                    None,
                )

            if chosen is None:
                logger.error("File not found on server: %s", norm_rel_path)
                raise ResourceNotFoundError(f"File not found on server: {norm_rel_path}")

            try:
                file_size = os.path.getsize(chosen)
                if file_size > _TOKEN_SIZE_LIMIT * 2:
                    logger.warning("File too large: %s (%s bytes)", chosen, file_size)
                    info["content"] = f"File too large to process: {norm_rel_path}"
                    info["tokenCount"] = -1
                else:
                    content = self._storage.read_text(chosen)
                    if content is None:
                        logger.error("Failed reading file (None): %s", chosen)
                        raise ResourceNotFoundError(f"Unable to read file: {norm_rel_path}")
                    info["content"] = content
                    info["tokenCount"] = (
                        -1
                        if len(content) > _TOKEN_SIZE_LIMIT
                        else self._token_count(content)
                    )
            except PermissionError as exc:
                logger.error("Permission denied reading %s: %s", chosen, exc)
                raise PermissionDeniedError(f"Permission denied: {norm_rel_path}") from exc
            results.append(info)

        return results

    # (small utility helpers unchanged)
    def resolve_folder_path(self, folder_name: str) -> str:
        if not folder_name:
            logger.error("folderName cannot be empty")
            raise InvalidInputError("folderName cannot be empty.")

        if os.path.isabs(folder_name) and os.path.isdir(folder_name):
            return self._norm(os.path.abspath(folder_name))

        cwd = os.getcwd()
        for up in (cwd, os.path.dirname(cwd), os.path.dirname(os.path.dirname(cwd))):
            candidate = os.path.join(up, folder_name)
            if os.path.isdir(candidate):
                return self._norm(os.path.abspath(candidate))

        # If still not found, re
