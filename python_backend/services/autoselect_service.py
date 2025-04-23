# --------------------------------------------------------------------------- #
#   python_backend/services/autoselect_service.py                             #
# --------------------------------------------------------------------------- #
"""
AutoselectService – vNext (2025‑04‑22 patch‑2)
──────────────────────────────────────────────
Quality‑of‑life upgrades focused on **correctness**:

• Fuzzy path resolution:
    ↳ Falls back to *unique* basename or suffix matches (≤ 3 segments) when the
      LLM omits leading directories or returns mixed slashes / absolute paths.
• Stricter de‑duplication & sanitisation of upstream items.
• Heavier inline comments + type hints for clarity.

No external dependencies were added – drop‑in replacement.
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import re
from functools import lru_cache
from typing import Any, Dict, List, Set, Tuple

import httpx

from models.autoselect_request import AutoSelectRequest
from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService  # language‑aware summaries

logger = logging.getLogger(__name__)


class AutoselectService:
    _URL: str = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL: str = "google/gemini-2.0-flash-exp:free"

    class UpstreamError(RuntimeError):
        """Network / HTTP / format issues talking to OpenRouter."""
        ...

    class ConfigError(RuntimeError):
        """Service mis‑configuration (e.g. missing API key)."""
        ...

    # Strict JSON response schema – still asks for *selected* root key.
    _SCHEMA: Dict[str, Any] = {
        "name": "selected_paths",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "selected": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["selected"],
            "additionalProperties": False,
        },
    }

    # ─────────────────────────────────────────── init ────────────────────────
    def __init__(self) -> None:
        self.api_key: str | None = os.getenv("OPENROUTER_API_KEY")
        self.model: str = os.getenv("AUTOSELECT_MODEL", self._DEFAULT_MODEL)

        self._storage = FileStorageRepository()
        self._codemap = CodemapService(storage_repo=self._storage)

        if not self.api_key:
            logger.warning(
                "AutoselectService started WITHOUT OPENROUTER_API_KEY – calls will fail."
            )
        logger.info("AutoselectService ready (model = %s)", self.model)

    # ───────────────────────────────────────── public API ────────────────────
    def autoselect_paths(
        self,
        request_obj: AutoSelectRequest,
        *,
        timeout: float = 20.0,
    ) -> Tuple[List[str], str]:
        """
        Call OpenRouter with a graph‑aware prompt and post‑process the reply.

        Returns
        -------
        (selected_paths, raw_reply)
        """
        if not self.api_key:
            raise self.ConfigError(
                "Server mis‑configuration: OPENROUTER_API_KEY is not set."
            )

        prompt: str = self._build_prompt(request_obj)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict JSON generator. "
                        "Return ONLY the JSON matching the schema."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.0,
            "max_tokens": 256,
            "response_format": {
                "type": "json_schema",
                "json_schema": self._SCHEMA,
            },
            "structured_outputs": True,
        }
        headers: Dict[str, str] = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                rsp = client.post(self._URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("Transport error calling OpenRouter: %s", exc)
            raise self.UpstreamError("OpenRouter unreachable") from exc

        if rsp.status_code != 200:
            logger.warning(
                "OpenRouter autoselect error %s → %.200s", rsp.status_code, rsp.text
            )
            raise self.UpstreamError(f"Upstream HTTP {rsp.status_code}")

        try:
            raw: str = rsp.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.error("Failed to parse OpenRouter autoselect response: %s", exc)
            raise self.UpstreamError("Malformed upstream JSON") from exc

        logger.debug(
            "↩ OpenRouter Autoselect (trimmed): %s",
            raw[:350].replace("\n", " ⏎ "),
        )

        parsed: Any = self._extract_json(raw)
        if parsed is not None:
            items: List[str] = self._normalise_parsed(parsed, request_obj.treePaths)
            return items, raw

        # Legacy line‑scanner fallback
        items = self._legacy_parse(raw, request_obj.treePaths)
        return items, raw

    # ────────────────────────────────── normalisation helper ────────────────
    def _normalise_parsed(self, parsed: Any, allowed: List[str]) -> List[str]:
        """
        Accept both:
            • { "selected": [ … ] }
            • { "paths":    [ … ] }
            • { "files":    [ … ] }
            • [ … ]
        """
        if isinstance(parsed, list):
            candidate: List[str] = parsed
        elif isinstance(parsed, dict):
            for key in ("selected", "paths", "files"):
                if key in parsed and isinstance(parsed[key], list):
                    candidate = parsed[key]  # type: ignore[assignment]
                    break
            else:
                # Dict without a recognised key – treat keys themselves
                candidate = list(parsed)  # type: ignore[assignment]
        else:
            candidate = []

        return self._massage(candidate, allowed)

    # ───────────────────────────── prompt / graph helpers (unchanged) ───────
    _TOKEN_HARD_LIMIT: int = 45_000 #O3 için 
    _SUMMARY_MAX_CHARS: int = 700

    def _build_prompt(self, req: AutoSelectRequest) -> str:
        graph_block: str = self._build_graph(req)

        preamble: str = (
            "You are a code‑aware assistant. "
            "Given the project *file graph* and the user's task, "
            "decide which **relative paths** must be read entirely to fulfil the task. "
            "Return ONLY the paths as a JSON object conforming to the provided schema. "
            "Supported languages: C/C++, Python, JavaScript / TypeScript / TSX.\n\n"
        )

        if graph_block:
            return (
                f"{preamble}"
                f"### Task\n{req.instructions}\n\n"
                f"### File Graph\n{graph_block}"
            )

        logger.info("Graph build skipped – falling back to flat file list.")
        return (
            f"{preamble}"
            f"### Task\n{req.instructions}\n\n"
            "### Files\n" + "\n".join(req.treePaths)
        )

    def _build_graph(self, req: AutoSelectRequest) -> str:
        if not req.baseDir or not os.path.isdir(req.baseDir):
            return ""

        blocks: List[str] = []
        used_tokens: int = 0

        for rel in req.treePaths:
            abs_path: str = os.path.normpath(os.path.join(req.baseDir, rel))
            if not os.path.isfile(abs_path):
                continue

            summary: str = self._file_summary(abs_path, rel)
            est_tokens: int = len(summary) // 4
            if used_tokens + est_tokens > self._TOKEN_HARD_LIMIT:
                break

            lang: str = pathlib.Path(abs_path).suffix.lstrip(".") or "txt"
            blocks.append(
                f'<file path="{rel}" lang="{lang}">\n'
                f"```{lang}\n{summary}\n```\n</file>"
            )
            used_tokens += est_tokens

        return "\n\n".join(blocks)

    @lru_cache(maxsize=2048)
    def _file_summary(self, abs_path: str, rel_path: str) -> str:
        """
        Try codemap extraction first; fall back to a cheap regex summary.
        """
        data = None
        try:
            data = self._codemap._extract_one(abs_path, rel_path)  # pylint: disable=protected-access
        except Exception:
            pass

        if data:
            parts: List[str] = []
            if data["classes"]:
                parts.append(f"Classes: {', '.join(data['classes'][:10])}")
            if data["functions"]:
                parts.append(f"Functions: {', '.join(data['functions'][:15])}")
            if data["references"]:
                parts.append(f"Refs: {', '.join(data['references'][:20])}")
            return "; ".join(parts)

        return self._cheap_summary(self._storage.read_text(abs_path) or "")

    def _cheap_summary(self, text: str, max_len: int = _SUMMARY_MAX_CHARS) -> str:
        if not text:
            return ""
        header_re = re.compile(
            r"^\s*(?:class|struct|namespace|def|function|fn|template[\w\s<>]*|"
            r"[\w:<>]+\s+[\w:]+::[\w:]+\s*\(|[\w:<>]+\s+[\w:]+\s*\()",
            re.M,
        )
        headers = header_re.findall(text)[:50]
        if headers:
            return " / ".join(h.strip() for h in headers)
        return re.sub(r"\s+", " ", text.strip())[: max_len - 1] + "…"

    # ───────────────────────────── json / path utils (extended) ─────────────
    _FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]+?)\s*```", re.IGNORECASE)

    def _extract_json(self, text: str) -> Any | None:
        """
        Attempt to locate a JSON segment inside fenced or raw output.
        Returns parsed object or None.
        """
        cleaned = text.strip()
        m = self._FENCE_RE.search(cleaned)
        if m:
            cleaned = m.group(1).strip()

        start = cleaned.find("[")
        alt = cleaned.find("{")
        if alt != -1 and (start == -1 or alt < start):
            start = alt
        if start == -1:
            return None

        cleaned = cleaned[start:]
        try:
            return json.loads(cleaned)
        except Exception:
            return None

    # ────────────────────────────── enhanced massage logic ──────────────────
    @staticmethod
    def _norm(path: str) -> str:
        """Normalise path: strip leading ./\\, collapse slashes, POSIX‑ify."""
        return pathlib.PurePosixPath(path.lstrip("./\\")).as_posix()

    def _massage(self, items: List[str], allowed: List[str]) -> List[str]:
        """
        Convert *items* from the model into valid, de‑duplicated selections.

        Fuzzy strategy
        --------------
        1. Exact normalised match.
        2. Unique basename match (e.g. `autoselect_service.py`).
        3. Unique ≤ 3‑segment suffix match (e.g. `services/autoselect_service.py`).

        A path is accepted **only** if resolution is unambiguous.
        """
        # Build lookup tables -------------------------------------------------
        allow_norm: List[str] = [self._norm(a) for a in allowed]

        allow_exact: Dict[str, str] = {p.lower(): orig for p, orig in zip(allow_norm, allowed)}

        basename_map: Dict[str, List[str]] = {}
        suffix_map: Dict[str, List[str]] = {}

        for norm, orig in zip(allow_norm, allowed):
            bn = pathlib.PurePosixPath(norm).name.lower()
            basename_map.setdefault(bn, []).append(orig)

            segments = norm.split("/")
            # 1‑, 2‑, 3‑segment suffixes
            for i in range(1, min(4, len(segments) + 1)):
                suffix = "/".join(segments[-i:]).lower()
                suffix_map.setdefault(suffix, []).append(orig)

        # Process model suggestions ------------------------------------------
        chosen: List[str] = []
        seen: Set[str] = set()

        for raw in items:
            if not isinstance(raw, str):
                continue
            candidate_raw: str = raw.strip().rstrip(",;")
            candidate_norm: str = self._norm(candidate_raw).lower()

            resolved: str | None = None

            # a) Exact match
            if candidate_norm in allow_exact:
                resolved = allow_exact[candidate_norm]

            # b) Unique basename match
            if resolved is None:
                bn = pathlib.PurePosixPath(candidate_norm).name.lower()
                matches = basename_map.get(bn, [])
                if len(matches) == 1:
                    resolved = matches[0]

            # c) Unique ≤ 3‑segment suffix match
            if resolved is None:
                matches = suffix_map.get(candidate_norm, [])
                if len(matches) == 1:
                    resolved = matches[0]

            if resolved and resolved not in seen:
                seen.add(resolved)
                chosen.append(resolved)

        return chosen

    # ────────────────────────────── legacy line parser ──────────────────────
    def _strip_fmt(self, line: str) -> str:
        """Remove common list / markdown bullets and stray quotes."""
        line = line.strip().lstrip("-*•`").rstrip("`")
        return line.rstrip(",;[] ").strip('"\'')

    def _legacy_parse(self, raw: str, allowed: List[str]) -> List[str]:
        lines = [self._strip_fmt(l) for l in raw.splitlines() if l.strip()]
        return self._massage(lines, allowed)
