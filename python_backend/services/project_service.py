# FILE: python_backend/services/project_service.py
# UPDATED: 2025-05-30 – binary-file tolerance & minor perf tweaks

from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional, Set

import pathspec  # git-wildmatch implementation

from repositories.file_storage import FileStorageRepository
from services.exclusion_service import ExclusionService
from services.service_exceptions import (
    InvalidInputError,
    PermissionDeniedError,
    ResourceNotFoundError,
    wrap_service_methods,
)

logger = logging.getLogger(__name__)

try:
    import tiktoken  # type: ignore

    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:  # pragma: no cover
    _ENC = None
    logger.info("tiktoken unavailable – falling back to regex token counter.")

# ───────────────────────── constants ───────────────────────── #

_MAX_TREE_DEPTH: int = int(os.getenv("CTP_MAX_TREE_DEPTH", "50"))
_TOKEN_SIZE_LIMIT: int = int(os.getenv("CTP_TOKEN_SIZE_LIMIT", "2000000"))  # ≈2 MB
_TOKEN_SPLIT_RE: re.Pattern[str] = re.compile(r"\s+|([,.;:!?(){}\[\]<>\"'])")

# ─────────────────────── service class ─────────────────────── #


@wrap_service_methods
class ProjectService:
    """
    Stateless helpers for project-level operations.
    Instantiate once per request for DI-friendly tests.
    """

    # ─────────────────── init / DI wiring ─────────────────── #

    def __init__(
        self,
        storage_repo: FileStorageRepository,
        exclusion_service: ExclusionService,
    ) -> None:
        self._storage = storage_repo
        self._excl = exclusion_service

    # ───────────────────── utilities ────────────────────── #

    @staticmethod
    def _norm(path: str) -> str:
        """Normalise slashes and strip leading './'."""
        p = os.path.normpath(path).replace("\\", "/")
        return p[2:] if p.startswith("./") else p

    # ---------------- token counting ---------------- #

    @staticmethod
    def _regex_token_count(text: str) -> int:
        return len(_TOKEN_SPLIT_RE.split(text.strip()))

    def _token_count(self, text: str) -> int:
        if _ENC is None:
            return self._regex_token_count(text)
        try:
            return len(_ENC.encode(text))
        except Exception:  # pragma: no cover
            return self._regex_token_count(text)

    def estimate_token_count(self, text: str) -> int:  # noqa: D401
        """≈ token count for *text* (fast)."""
        return self._token_count(text)

    # ─────────────────── tree builder ─────────────────── #

    def _expand_simple_pattern(self, p: str) -> List[str]:
        if any(ch in p for ch in "*?[]!"):
            return [p]
        cleaned = p.rstrip("/")
        return [cleaned, f"{cleaned}/**"]

    def _make_pathspec(self, patterns: List[str]) -> pathspec.PathSpec:
        lines: List[str] = []
        for pat in (p.strip() for p in patterns if p.strip()):
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
            if logger.isEnabledFor(logging.WARNING):
                logger.warning("Max depth (%s) exceeded – pruning %s", _MAX_TREE_DEPTH, cur_dir)
            return

        try:
            with os.scandir(cur_dir) as it:
                for entry in it:
                    try:
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
                            self._walk(
                                entry.path, base_dir, spec, node["children"], depth + 1, visited
                            )
                            if not node["children"]:
                                continue  # drop empty dirs post-exclude
                        out.append(node)
                    except PermissionError as exc:
                        logger.error("Permission denied reading %s: %s", entry.path, exc)
                        raise PermissionDeniedError(f"Permission denied: {entry.path}") from exc
                    except OSError as exc:
                        logger.error("OS error reading %s: %s", entry.path, exc)
        except PermissionError as exc:
            logger.error("Permission denied scanning %s: %s", cur_dir, exc)
            raise PermissionDeniedError(f"Permission denied: {cur_dir}") from exc
        except FileNotFoundError as exc:
            logger.error("Directory vanished: %s", cur_dir)
            raise ResourceNotFoundError(f"Directory not found: {cur_dir}") from exc

    def get_project_tree(self, root_dir: str) -> List[Dict[str, Any]]:
        if not root_dir:
            raise InvalidInputError("rootDir must not be empty.")
        if not os.path.isdir(root_dir):
            raise ResourceNotFoundError(f"Project root directory not found: {root_dir}")

        root_dir = os.path.abspath(root_dir)
        spec = self._make_pathspec(
            [
                *self._excl.get_global_exclusions(),
                *self._excl.get_local_exclusions(root_dir),
            ]
        )

        tree: List[Dict[str, Any]] = []
        self._walk(root_dir, root_dir, spec, tree)
        tree.sort(key=lambda n: (n["type"] != "directory", n["name"].lower()))
        return tree

    # ───────────── candidate-path expander ───────────── #

    def _candidate_paths(self, base_dir: str, raw: str) -> List[str]:
        """Generate plausible absolute paths for *raw* under/around *base_dir*."""
        base_abs = os.path.abspath(base_dir)
        raw_abs = os.path.abspath(raw)

        cand: List[str] = [raw_abs]
        if not os.path.isabs(raw):
            cand.append(os.path.join(base_abs, raw))
        elif raw_abs.startswith(base_abs):
            cand.append(os.path.join(base_abs, os.path.relpath(raw_abs, base_abs)))

        cand.append(os.path.abspath(os.path.join(os.getcwd(), raw)))

        seen: Set[str] = set()
        uniq: List[str] = []
        for c in cand:
            n = os.path.normpath(c)
            if n not in seen:
                seen.add(n)
                uniq.append(n)
        return uniq

    # ───────────── bulk file-content loader ───────────── #

    # noqa: C901 (complex but cohesive)
    def get_files_content(
        self,
        base_dir: str,
        relative_paths: List[str],
    ) -> List[Dict[str, Any]]:
        """
        Return contents & token counts for *relative_paths*.

        • Directories → placeholder (`"isDirectory": True`).  
        • Non-UTF-8 or binary files → placeholder (`"isBinary": True`).  
        • Missing files → `ResourceNotFoundError`.
        """
        if not base_dir:
            raise InvalidInputError("baseDir must not be empty.")
        if not os.path.isdir(base_dir):
            raise ResourceNotFoundError(f"Base directory not found: {base_dir}")
        if not isinstance(relative_paths, list):
            raise InvalidInputError("paths must be a list of strings.")

        base_abs = os.path.abspath(base_dir)
        results: List[Dict[str, Any]] = []

        for raw_rel in relative_paths:
            rel = self._norm(raw_rel)
            info: Dict[str, Any] = {"path": rel, "content": "", "tokenCount": 0}

            expected = os.path.normpath(os.path.join(base_abs, rel))

            # ── directory? return placeholder ──
            if os.path.isdir(expected):
                info.update({"content": None, "isDirectory": True})
                results.append(info)
                continue

            # ── locate file ──
            chosen = expected if os.path.isfile(expected) else next(
                (p for p in self._candidate_paths(base_dir, raw_rel) if os.path.isfile(p)),
                None,
            )

            if chosen is None:
                raise ResourceNotFoundError(f"File not found on server: {rel}")

            # ── read & tokenise ──
            try:
                size = os.path.getsize(chosen)
                if size > _TOKEN_SIZE_LIMIT * 2:
                    info["content"] = f"File too large to process: {rel}"
                    info["tokenCount"] = -1
                else:
                    try:
                        content = self._storage.read_text(chosen)
                    except UnicodeDecodeError:
                        # 🆕 Binary / non-UTF-8 safeguard
                        info.update(
                            {
                                "content": None,
                                "isBinary": True,
                                "size": size,
                                "tokenCount": 0,
                            }
                        )
                        results.append(info)
                        continue

                    if content is None:
                        raise ResourceNotFoundError(f"Unable to read file: {rel}")

                    info["content"] = content
                    info["tokenCount"] = (
                        -1 if len(content) > _TOKEN_SIZE_LIMIT else self._token_count(content)
                    )
            except PermissionError as exc:
                raise PermissionDeniedError(f"Permission denied: {rel}") from exc
            except OSError as exc:
                # Covers unexpected I/O issues (e.g., device errors)
                logger.error("OS error reading %s: %s", chosen, exc)
                raise ResourceNotFoundError(f"Unable to read file: {rel}") from exc

            results.append(info)

        return results

    # ───────────────────── misc helpers ───────────────────── #

    def resolve_folder_path(self, folder_name: str) -> str:
        """Return an absolute path for *folder_name*, searching upward."""
        if not folder_name:
            raise InvalidInputError("folderName cannot be empty.")

        if os.path.isabs(folder_name) and os.path.isdir(folder_name):
            return self._norm(os.path.abspath(folder_name))

        cwd = os.getcwd()
        for up in (cwd, os.path.dirname(cwd), os.path.dirname(os.path.dirname(cwd))):
            cand = os.path.join(up, folder_name)
            if os.path.isdir(cand):
                return self._norm(os.path.abspath(cand))

        raise ResourceNotFoundError(f"Folder not found: {folder_name}")
