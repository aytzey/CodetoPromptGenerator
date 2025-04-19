"""
services/autoselect_service.py
──────────────────────────────
Gemma‑3‑27B‑IT + Structured Outputs
──────────────────────────────────
• Removes ```json fences (and any markdown) before JSON‑parsing
• Accepts object → {selected:[...]} *or* bare array
• Legacy line parser now strips quotes even when a trailing comma is present
• Reads API Key and Model from environment variables.
"""

from __future__ import annotations

import json
import logging
import pathlib
import re
import os # <-- Import os
from typing import Dict, List, Set, Tuple

import httpx

from models.autoselect_request import AutoSelectRequest

logger = logging.getLogger(__name__)


class AutoselectService:
    _URL   = "https://openrouter.ai/api/v1/chat/completions"
    # Default model if not set in environment
    _DEFAULT_MODEL = "google/gemma-3-27b-it:free"

    class UpstreamError(RuntimeError): ...
    class ConfigError(RuntimeError): ... # For missing config

    _SCHEMA: Dict = {
        "name": "selected_paths",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "selected": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Relative paths the model must read",
                }
            },
            "required": ["selected"],
            "additionalProperties": False,
        },
    }

    def __init__(self):
        # Load config from environment variables during initialization
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = os.getenv("AUTOSELECT_MODEL", self._DEFAULT_MODEL)

        if not self.api_key:
            logger.error("OPENROUTER_API_KEY environment variable is not set.")
            # Raise configuration error immediately if key is missing
            # Alternatively, could check in the method call, but failing early is often better.
            # raise self.ConfigError("Server mis-configuration: OPENROUTER_API_KEY is not set.")
            # Let's check in the method instead to allow service instantiation even if key is missing initially

        logger.info(f"AutoselectService initialized with model: {self.model}")


    # ──────────────────────────────────────────────────────────
    # Public
    # ──────────────────────────────────────────────────────────
    def autoselect_paths(
        self,
        request_obj: AutoSelectRequest,
        # api_key: str, # <-- No longer passed as argument
        *,
        timeout: float = 20.0,
    ) -> Tuple[List[str], str]:

        # Check for API key here, before making the call
        if not self.api_key:
            raise self.ConfigError("Server mis-configuration: OPENROUTER_API_KEY is not set.")

        payload = {
            "model": self.model, # Use model from environment
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict JSON generator. "
                        "Return ONLY the JSON that matches the schema."
                    ),
                },
                {"role": "user", "content": self._build_prompt(request_obj)},
            ],
            "temperature": 0,
            "max_tokens": 256,
            "response_format": {"type": "json_schema", "json_schema": self._SCHEMA},
            "structured_outputs": True,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}", # Use API key from environment
            "Content-Type": "application/json"
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                rsp = client.post(self._URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("Transport error calling OpenRouter for autoselect: %s", exc)
            raise self.UpstreamError("OpenRouter unreachable") from exc

        if rsp.status_code != 200:
            logger.warning("OpenRouter autoselect error %s → %.200s", rsp.status_code, rsp.text)
            raise self.UpstreamError(f"Upstream HTTP {rsp.status_code}")

        try:
            raw = rsp.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.error("Failed to parse OpenRouter autoselect response: %s", exc)
            raise self.UpstreamError("Malformed upstream JSON") from exc

        logger.debug("↩ OpenRouter Autoselect (trimmed) : %s", raw[:350].replace("\n", " ⏎ "))

        # ① Try to parse JSON (object or array) after stripping fences
        parsed = self._extract_json(raw)
        if parsed is not None:
            items = (
                self._massage(parsed["selected"], request_obj.treePaths)
                if isinstance(parsed, dict) and "selected" in parsed
                else self._massage(parsed, request_obj.treePaths)
            )
            return items, raw

        # ② Fallback line‑scanner (handles weird prose)
        items = self._legacy_parse(raw, request_obj.treePaths)
        return items, raw

    # ──────────────────────────────────────────────────────────
    # Prompt builder
    # ──────────────────────────────────────────────────────────
    @staticmethod
    def _build_prompt(req: AutoSelectRequest) -> str:
        return (
            "Given the following list of project files and the user's task, "
            "return ONLY the relative paths needed to fulfil the task.\n\n"
            f"### Task\n{req.instructions}\n\n"
            f"### Files\n" + "\n".join(req.treePaths)
        )

    # ──────────────────────────────────────────────────────────
    # JSON helpers
    # ──────────────────────────────────────────────────────────
    _FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]+?)\s*```", re.IGNORECASE)

    def _extract_json(self, text: str):
        """Remove ``` fences & return a Python object if JSON is valid."""
        cleaned = text.strip()
        m = self._FENCE_RE.search(cleaned)
        if m:  # content inside a code‑block
            cleaned = m.group(1).strip()

        # Grab first JSON‑looking substring to be extra safe
        start = cleaned.find("[")
        alt   = cleaned.find("{")
        if alt != -1 and (start == -1 or alt < start):
            start = alt
        if start == -1:
            return None

        cleaned = cleaned[start:]

        try:
            return json.loads(cleaned)
        except Exception:
            return None  # let caller fall back

    # ──────────────────────────────────────────────────────────
    # Path post‑processing
    # ──────────────────────────────────────────────────────────
    @staticmethod
    def _norm(p: str) -> str:
        """./foo → foo  •  backslashes → slashes"""
        p = p.lstrip("./\\").strip()
        return pathlib.PurePosixPath(p).as_posix()

    def _massage(self, items: List[str], allowed: List[str]) -> List[str]:
        """Case‑insensitive de‑dupe & normalisation."""
        allow_map = {self._norm(a).lower(): a for a in allowed}

        seen: Set[str] = set()
        out:  List[str] = []

        for itm in items:
            if not isinstance(itm, str): # Added type check for safety
                logger.warning(f"Skipping non-string item in autoselect results: {itm}")
                continue
            norm = self._norm(itm)
            key  = norm.lower()
            if key in seen:
                continue
            # Ensure the selected path actually exists in the provided treePaths
            if key in allow_map:
                seen.add(key)
                out.append(allow_map[key])
            else:
                 logger.debug(f"Autoselect proposed path not in original tree: '{itm}' (normalized: '{norm}')")


        return out

    # ──────────────────────────────────────────────────────────
    # Legacy line parser – be very forgiving
    # ──────────────────────────────────────────────────────────
    @staticmethod
    def _strip_fmt(line: str) -> str:
        # remove bullets or fences
        line = line.strip().lstrip("-*•`").rstrip("`")
        # trim trailing comma / semicolon / bracket
        line = line.rstrip(",;[] ")
        # finally strip surrounding quotes if present
        return line.strip('"\'')

    def _legacy_parse(self, raw: str, allowed: List[str]) -> List[str]:
        lines = [self._strip_fmt(l) for l in raw.splitlines() if l.strip()]
        return self._massage(lines, allowed)