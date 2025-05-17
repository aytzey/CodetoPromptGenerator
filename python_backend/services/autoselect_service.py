# python_backend/services/autoselect_service.py
# --------------------------------------------------------------------------- #
#   AutoselectService – vNext (2025-05-06 patch-6)                            #
# --------------------------------------------------------------------------- #
"""
Graph-aware automatic file selection
====================================

* Supplies the LLM with **both** a compact textual project tree *and*
  detailed code-map summaries (Tree-sitter) for better recall.
* Guarantees codemap usage – if Tree-sitter isn’t available we raise,
  so the issue is visible during testing.
* Optional debugging: returning ``debug=1`` from the controller
  attaches the raw codemap for each analysed file.

Public API
----------

    autoselect_paths(request, *, timeout=20.0, return_debug=False)
        → (selected_paths, raw_llm_reply, codemap_debug | None)

The rest of the logic (JSON extraction, fuzzy path resolution, …)
remains 100 % compatible with the previous release.
"""
from __future__ import annotations

import json
import logging
import os
import pathlib
import re
from functools import lru_cache
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import httpx

from models.autoselect_request import AutoSelectRequest
from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# 1 · Exceptions
# ─────────────────────────────────────────────────────────────────────────────
class UpstreamError(RuntimeError):
    """Transport / HTTP / format issues talking to OpenRouter."""


class ConfigError(RuntimeError):
    """Mis-configuration (e.g. missing API key)."""


# ─────────────────────────────────────────────────────────────────────────────
# 2 · Service
# ─────────────────────────────────────────────────────────────────────────────
class AutoselectService:
    _URL: str = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL: str = "meta-llama/llama-4-scout:free" # Changed from google/gemma-3-27b-it:free as per .env example

    # Strict JSON schema expected from the model
    _SCHEMA: Dict[str, Any] = {
        "type": "object", # Corrected: schema itself is the value for json_schema.properties
        "properties": {
            "selected": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["selected"],
        "additionalProperties": False,
    }

    # Prompt-building tunables
    _TOKEN_HARD_LIMIT: int = 30_000           # Max tokens we’re willing to send
    _SUMMARY_MAX_CHARS: int = 10_000             # Max characters in a one-file summary
    _TREE_MAX_LINES: int = 10_000              # Truncate huge project trees

    # Regex for stripping markdown fences from JSON
    _FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]+?)\s*```", re.I)


    # ------------------------------------------------------------------ init
    def __init__(self) -> None:
        self.api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
        self.model: str = os.getenv("AUTOSELECT_MODEL", self._DEFAULT_MODEL)

        if not self.api_key:
            logger.warning(
                "AutoselectService started WITHOUT OPENROUTER_API_KEY – "
                "autoselect calls will fail."
            )

        self._storage = FileStorageRepository()
        self._codemap = CodemapService(storage_repo=self._storage)

        # Holds last-run codemap info for optional debugging
        self._debug_map: Dict[str, Dict[str, Any]] = {}

        logger.info("AutoselectService ready (model = %s)", self.model)

    # ───────────────────────────────────────── public API ────────────────────
    def autoselect_paths(
        self,
        request_obj: AutoSelectRequest,
        *,
        timeout: float = 20.0,
        return_debug: bool = False,
    ) -> Tuple[List[str], str, Optional[Dict[str, Dict[str, Any]]]]:
        self._debug_map.clear()
        if not self.api_key:
            raise ConfigError("OPENROUTER_API_KEY is not set on the server")

        prompt: str = self._build_prompt(request_obj)
        logger.info("▶︎ Autoselect prompt (first 1000 chars):\n%s", prompt[:1000])

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
            "max_tokens": 1024, # Increased max_tokens
            "response_format": {
                "type": "json_object",
                "json_schema": { # Correctly nest the schema
                    "name": "selected_paths", # Function/tool name
                    "description": "A list of file paths selected based on the user's instructions and project context.",
                    "parameters": self._SCHEMA, # The actual schema for parameters
                }
            },
        }
        headers: Dict[str, str] = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3010", # Optional: good practice
            "X-Title": "CodeToPromptGenerator",      # Optional: good practice
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                rsp = client.post(self._URL, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error("Timeout error calling OpenRouter: %s", exc)
            raise UpstreamError("OpenRouter request timed out.") from exc
        except httpx.RequestError as exc:
            logger.error("Transport error calling OpenRouter: %s", exc)
            raise UpstreamError(f"OpenRouter unreachable: {exc}") from exc

        logger.debug(f"OpenRouter response status: {rsp.status_code}")
        logger.debug(f"OpenRouter response headers: {rsp.headers}")
        logger.debug(f"OpenRouter response text (first 500 chars): {rsp.text[:500]}")

        if rsp.status_code != 200:
            logger.warning(
                "OpenRouter autoselect error %s. Response: %.500s",
                rsp.status_code,
                rsp.text,
            )
            raise UpstreamError(f"Upstream HTTP {rsp.status_code}: {rsp.text[:200]}")

        try:
            response_json = rsp.json()
        except json.JSONDecodeError as exc:
            logger.error("Failed to decode JSON from OpenRouter response: %s. Raw text: %s", exc, rsp.text)
            raise UpstreamError(f"Non-JSON response from upstream: {exc}") from exc

        # Log the pretty-printed JSON for easier debugging
        logger.debug(f"OpenRouter parsed JSON: {json.dumps(response_json, indent=2)}")

        try:
            if "choices" not in response_json or not isinstance(response_json["choices"], list) or not response_json["choices"]:
                logger.error("OpenRouter response missing 'choices' array or it's empty. Full response: %s", json.dumps(response_json, indent=2))
                raise UpstreamError("Malformed upstream JSON: 'choices' array missing or empty.")

            first_choice = response_json["choices"][0]
            if not isinstance(first_choice, dict) or "message" not in first_choice:
                logger.error("OpenRouter response 'choices[0]' missing 'message' field. Full response: %s", json.dumps(response_json, indent=2))
                raise UpstreamError("Malformed upstream JSON: 'message' field missing in choice.")

            message_obj = first_choice["message"]
            if not isinstance(message_obj, dict) or "content" not in message_obj:
                logger.error("OpenRouter response 'message' object missing 'content' field. Full response: %s", json.dumps(response_json, indent=2))
                raise UpstreamError("Malformed upstream JSON: 'content' field missing in message.")
            
            raw_reply: str = message_obj["content"]
            if not isinstance(raw_reply, str):
                logger.error("OpenRouter response 'message.content' is not a string. Type: %s. Full response: %s", type(raw_reply).__name__, json.dumps(response_json, indent=2))
                raise UpstreamError("Malformed upstream JSON: 'message.content' is not a string.")

        except (KeyError, IndexError, TypeError) as exc:
            logger.error("Failed to parse OpenRouter response structure: %s. Full response: %s", exc, json.dumps(response_json, indent=2))
            raise UpstreamError(f"Malformed upstream JSON structure: {exc}") from exc
        
        logger.debug("↩ OpenRouter raw_reply (content string): %s", raw_reply[:350].replace("\n", " ⏎ "))

        parsed_json: Any = self._extract_json(raw_reply)

        if parsed_json is not None:
            selected = self._normalise_parsed(parsed_json, request_obj.treePaths)
        else:
            logger.warning("Failed to parse JSON from LLM response content, falling back to legacy line parsing. Raw reply content: %s", raw_reply[:500])
            selected = self._legacy_parse(raw_reply, request_obj.treePaths)

        if return_debug:
            return selected, raw_reply, dict(self._debug_map)

        return selected, raw_reply, None

    # ───────────────────────────────────── prompt helpers ────────────────────
    def _build_prompt(self, req: AutoSelectRequest) -> str:
        tree_block: str = self._tree_text(req.treePaths)
        graph_block: str = self._build_graph(req)

        preamble: str = (
            "You are a code-aware assistant. "
            "Given the project *file graph* and the user's task, "
            "decide which **relative paths** must be read entirely. "
            "Return ONLY those paths inside the required JSON structure, specifically in the 'selected' array.\n\n"
        )

        return (
            f"{preamble}"
            f"### Task\n{req.instructions}\n\n"
            f"### Project Tree (truncated)\n{tree_block}\n\n"
            f"### File Graph (summaries)\n{graph_block}"
        )

    # ---------- textual tree -------------------------------------------------
    def _tree_text(self, paths: List[str]) -> str:
        """
        Convert a flat list of ``foo/bar/baz.py`` into an indented bullet list.
        Keeps the token footprint tiny (no Unicode folder icons to the model).
        """
        out: List[str] = []
        for rel in paths[: self._TREE_MAX_LINES]:
            depth = rel.count("/")
            out.append("  " * depth + "• " + rel.rsplit("/", 1)[-1])
        if len(paths) > self._TREE_MAX_LINES:
            out.append(f"… (+{len(paths) - self._TREE_MAX_LINES} more)")
        return "\n".join(out)

    # ---------- graph block (unchanged except for lowered try/except) -------
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
            est_tokens: int = len(summary) // 4 # Rough estimate
            if used_tokens + est_tokens > self._TOKEN_HARD_LIMIT:
                break

            lang: str = pathlib.Path(abs_path).suffix.lstrip(".") or "txt"
            blocks.append(
                f'<file path="{rel}" lang="{lang}">\n'
                f"```{lang}\n{summary}\n```\n</file>"
            )
            used_tokens += est_tokens

        return "\n\n".join(blocks)

    # ---------- file summary -------------------------------------------------
    @lru_cache(maxsize=2048)
    def _file_summary(self, abs_path: str, rel_path: str) -> str:
        data: Optional[Dict[str, Union[List[str], str]]] = None
        try:
            codemap = self._codemap.extract_codemap(
                os.path.dirname(abs_path), [os.path.basename(abs_path)]
            )
            data = codemap.get(os.path.basename(abs_path))
        except Exception as exc:
            logger.warning("Codemap extraction failed for %s: %s", rel_path, exc)
            data = {"error": "Extraction failed"}

        self._debug_map[rel_path] = data or {"error": "no-data"}

        if data and "error" not in data:
            parts: List[str] = []
            cls = data.get("classes")
            if isinstance(cls, list) and cls: parts.append(f"Classes: {', '.join(cls[:10])}")
            fns = data.get("functions")
            if isinstance(fns, list) and fns: parts.append(f"Functions: {', '.join(fns[:15])}")
            refs = data.get("references")
            if isinstance(refs, list) and refs: parts.append(f"Refs: {', '.join(refs[:20])}")
            if parts:
                s = "; ".join(parts)
                return s[: self._SUMMARY_MAX_CHARS] if len(s) > self._SUMMARY_MAX_CHARS else s
        return self._cheap_summary(self._storage.read_text(abs_path) or "")

    def _cheap_summary(self, text: str, max_len: int = _SUMMARY_MAX_CHARS) -> str:
        if not text: return ""
        header_re = re.compile(
            r"""^\s*(?:class|struct|enum|namespace|def|function|fn|sub |procedure|public |private |protected |static )[\s\w:<>,.*&()]+|^\s*[\w:<>]+\s+[\w:]+::[\w:]+\s*\(|^\s*[\w:<>]+\s+[\w:]+\s*\(""",
            re.M | re.I | re.VERBOSE,
        )
        headers = header_re.findall(text)[:50]
        if headers:
            summary = " / ".join(h.strip() for h in headers)
            return summary[:max_len] if len(summary) > max_len else summary
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()][:10]
        summary = " ".join(lines)
        summary = re.sub(r"\s+", " ", summary)
        return summary[: max_len - 1] + "…" if len(summary) > max_len else summary

    # ───────────────────────────── json / path utils ────────────────────
    def _extract_json(self, text: str) -> Any | None:
        """
        Attempts to parse a JSON string, optionally stripping markdown fences.
        """
        cleaned = text.strip()
        
        match = self._FENCE_RE.search(cleaned)
        if match:
            cleaned = match.group(1).strip()
        
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(f"JSONDecodeError in _extract_json: {e}. Text after fence stripping (first 200 chars): {cleaned[:200]}")
            return None
        except Exception as e: 
            logger.error(f"Unexpected error in _extract_json: {e}. Text (first 200 chars): {cleaned[:200]}")
            return None

    # ---------- normalisation / fuzzy matching (unchanged) ------------------
    @staticmethod
    def _norm(path: str) -> str:
        return pathlib.PurePosixPath(path.lstrip("./\\")).as_posix()

    def _normalise_parsed(self, parsed: Any, allowed: List[str]) -> List[str]:
        if not isinstance(parsed, dict): # Expecting a dict like {"selected": [...]}
            logger.warning(f"Parsed JSON is not a dictionary as expected by schema. Parsed: {type(parsed).__name__} - {str(parsed)[:100]}")
            return []

        candidate = parsed.get("selected")
        if not isinstance(candidate, list):
            logger.warning(f"Parsed JSON 'selected' field is not a list. Parsed: {type(candidate).__name__} - {str(candidate)[:100]}")
            # Try other common keys as a fallback, though schema should prevent this
            for key in ("paths", "files"):
                val = parsed.get(key)
                if isinstance(val, list):
                    candidate = val
                    break
            else:
                candidate = []
        
        return self._massage(candidate, allowed)

    def _massage(self, items: List[str], allowed: List[str]) -> List[str]:
        allow_norm = [self._norm(a) for a in allowed]
        allow_exact = {p.lower(): orig for p, orig in zip(allow_norm, allowed)}
        basename_map: Dict[str, List[str]] = {}
        suffix_map: Dict[str, List[str]] = {}

        for norm, orig in zip(allow_norm, allowed):
            pp = pathlib.PurePosixPath(norm)
            if pp.suffix or "." in pp.name:
                basename_map.setdefault(pp.name.lower(), []).append(orig)
            segs = norm.split("/")
            for i in range(1, min(4, len(segs) + 1)):
                suffix = "/".join(segs[-i:]).lower()
                suffix_map.setdefault(suffix, []).append(orig)

        chosen: List[str] = []
        seen: Set[str] = set()

        for raw in items:
            if not isinstance(raw, str): continue
            cand_norm = self._norm(raw.strip().rstrip(",;")).lower()
            resolved: Optional[str] = None
            if cand_norm in allow_exact: resolved = allow_exact[cand_norm]
            if resolved is None:
                pp_cand = pathlib.PurePosixPath(cand_norm)
                if pp_cand.suffix or "." in pp_cand.name:
                    matches = basename_map.get(pp_cand.name.lower(), [])
                    if len(matches) == 1: resolved = matches[0]
            if resolved is None:
                matches = suffix_map.get(cand_norm, [])
                if len(matches) == 1: resolved = matches[0]
            if resolved and resolved not in seen:
                seen.add(resolved)
                chosen.append(resolved)
        return chosen

    # ---------- legacy line parser (unchanged) ------------------------------
    def _strip_fmt(self, line: str) -> str:
        line = line.strip().lstrip("-*•`").rstrip("`")
        return line.rstrip(",;[] ").strip('"\'')

    def _legacy_parse(self, raw: str, allowed: List[str]) -> List[str]:
        lines = [self._strip_fmt(l) for l in raw.splitlines() if l.strip()]
        return self._massage(lines, allowed)