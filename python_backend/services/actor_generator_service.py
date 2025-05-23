from __future__ import annotations

import os
import json
import logging
import pathlib
from typing import Any, Dict, List, Optional, Tuple

import httpx

from models.actor_generate_request import ActorGenerateRequest
from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService

logger = logging.getLogger(__name__)


class ActorGeneratorService:
    _URL: str = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL: str = "meta-llama/llama-4-maverick:free"

    _SCHEMA: Dict[str, Any] = {
        "name": "actors",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "actors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "role": {"type": "string"},
                            "permissions": {"type": "array", "items": {"type": "string"}},
                            "goals": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["name", "role"],
                    },
                }
            },
            "required": ["actors"],
            "additionalProperties": False,
        },
    }

    _README_MAX_CHARS = 8000
    _TREE_MAX_LINES = 30000
    _SUMMARY_MAX_CHARS = 10000
    _TOKEN_HARD_LIMIT = 45000

    class UpstreamError(RuntimeError): ...
    class ConfigError(RuntimeError): ...

    def __init__(self) -> None:
        self.api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
        self.model: str = os.getenv("ACTOR_MODEL", self._DEFAULT_MODEL)
        if not self.api_key:
            logger.warning(
                "ActorGeneratorService started WITHOUT OPENROUTER_API_KEY – actor generation will fail."
            )
        self._storage = FileStorageRepository()
        self._codemap = CodemapService(storage_repo=self._storage)

    # ------------------------------------------------------------------ public
    def generate_actors(
        self, request_obj: ActorGenerateRequest, *, timeout: float = 30.0
    ) -> Tuple[List[Dict[str, Any]], str]:
        if not self.api_key:
            raise self.ConfigError("OPENROUTER_API_KEY is not set on the server")

        prompt = self._build_prompt(request_obj)
        logger.info("▶︎ Actor generation prompt (first 1000 chars)\n%s", prompt[:1000])

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a strict JSON generator. "
                        "Identify user actors according to the provided guide and project context. "
                        "Return ONLY the JSON matching the schema."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 1024,
            "response_format": {"type": "json_schema", "json_schema": self._SCHEMA},
            "structured_outputs": True,
        }
        headers: Dict[str, str] = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(self._URL, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            logger.error("Timeout calling OpenRouter for actor generation: %s", exc)
            raise self.UpstreamError("OpenRouter request timed out") from exc
        except httpx.RequestError as exc:
            logger.error("Request error calling OpenRouter: %s", exc)
            raise self.UpstreamError(f"Could not connect to OpenRouter: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            text = exc.response.text
            logger.error("HTTP error from OpenRouter (%s): %s", exc.response.status_code, text[:200])
            raise self.UpstreamError(f"OpenRouter API error ({exc.response.status_code})") from exc

        try:
            data = response.json()
            if not isinstance(data, dict) or "choices" not in data or not data["choices"]:
                raise self.UpstreamError("Invalid response structure from OpenRouter")
            choice = data["choices"][0]
            content = choice.get("message", {}).get("content", "").strip()
        except Exception as exc:
            logger.error("Failed to parse OpenRouter response: %s", exc)
            raise self.UpstreamError("Invalid response from OpenRouter") from exc

        try:
            obj = json.loads(content)
            actors = obj.get("actors")
            if not isinstance(actors, list):
                raise ValueError("Missing 'actors' array")
        except Exception as exc:
            logger.error("Failed to decode actors JSON: %s", exc)
            raise self.UpstreamError("Failed to parse JSON from model") from exc

        for i, actor in enumerate(actors, 1):
            if isinstance(actor, dict):
                actor.setdefault("id", i)
        return actors, content

    # ---------------------------------------------------------------- helpers
    def _build_prompt(self, req: ActorGenerateRequest) -> str:
        tree_block = self._tree_text(req.treePaths)
        graph_block = self._build_graph(req)
        readme_block = self._read_readme(req.baseDir)
        guide = (
            "Follow this step-by-step guide to identify actors:\n"
            "1. Understand the product context.\n"
            "2. Identify primary and secondary users or systems.\n"
            "3. Extract potential roles grouped by function, goal or permissions.\n"
            "4. Define responsibilities and goals.\n"
            "5. List key permissions or access rights."
        )
        return (
            f"{guide}\n\n"
            f"### README\n{readme_block}\n\n"
            f"### Project Tree\n{tree_block}\n\n"
            f"### File Graph\n{graph_block}"
        )

    def _read_readme(self, base_dir: Optional[str]) -> str:
        if not base_dir:
            return ""
        for name in ("README.md", "readme.md", "Readme.md"):
            path = os.path.join(base_dir, name)
            if os.path.isfile(path):
                try:
                    txt = self._storage.read_text(path) or ""
                    txt = txt.strip()[: self._README_MAX_CHARS]
                    if len(txt) < self._README_MAX_CHARS:
                        return txt
                    return txt + "\n... (truncated)"
                except Exception as exc:
                    logger.warning("Failed to read README %s: %s", path, exc)
                    return ""
        return ""

    def _tree_text(self, paths: List[str]) -> str:
        out: List[str] = []
        for rel in paths[: self._TREE_MAX_LINES]:
            depth = rel.count("/")
            out.append("  " * depth + "• " + rel.rsplit("/", 1)[-1])
        if len(paths) > self._TREE_MAX_LINES:
            out.append(f"… (+{len(paths) - self._TREE_MAX_LINES} more)")
        return "\n".join(out)

    def _build_graph(self, req: ActorGenerateRequest) -> str:
        if not req.baseDir or not os.path.isdir(req.baseDir):
            return ""
        blocks: List[str] = []
        used_tokens = 0
        for rel in req.treePaths:
            abs_path = os.path.normpath(os.path.join(req.baseDir, rel))
            if not os.path.isfile(abs_path):
                continue
            summary = self._file_summary(abs_path, rel)
            est_tokens = len(summary) // 4
            if used_tokens + est_tokens > self._TOKEN_HARD_LIMIT:
                break
            lang = pathlib.Path(abs_path).suffix.lstrip(".") or "txt"
            blocks.append(
                f'<file path="{rel}" lang="{lang}">\n```{lang}\n{summary}\n```\n</file>'
            )
            used_tokens += est_tokens
        return "\n\n".join(blocks)

    def _file_summary(self, abs_path: str, rel_path: str) -> str:
        try:
            codemap = self._codemap.extract_codemap(os.path.dirname(abs_path), [os.path.basename(abs_path)])
            data = codemap.get(os.path.basename(abs_path))
        except Exception as exc:
            logger.warning("Codemap extraction failed for %s: %s", rel_path, exc)
            data = {"error": "Extraction failed"}
        if data and "error" not in data:
            parts: List[str] = []
            cls = data.get("classes")
            if isinstance(cls, list) and cls:
                parts.append(f"Classes: {', '.join(cls[:10])}")
            fns = data.get("functions")
            if isinstance(fns, list) and fns:
                parts.append(f"Functions: {', '.join(fns[:15])}")
            refs = data.get("references")
            if isinstance(refs, list) and refs:
                parts.append(f"Refs: {', '.join(refs[:20])}")
            if parts:
                s = "; ".join(parts)
                return s[: self._SUMMARY_MAX_CHARS] if len(s) > self._SUMMARY_MAX_CHARS else s
        text = self._storage.read_text(abs_path) or ""
        return self._cheap_summary(text)

    def _cheap_summary(self, text: str, max_len: int = _SUMMARY_MAX_CHARS) -> str:
        if not text:
            return ""
        return " ".join(text.split()[: max_len // 5])
