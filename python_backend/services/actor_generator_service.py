from __future__ import annotations

import os
import json
import logging
import pathlib
from typing import Any, Dict, List, Optional, Tuple

import httpx

from models.actor_generate_request import ActorGenerateRequest
from services.service_exceptions import (
    wrap_service_methods,
    ConfigurationError,
    UpstreamServiceError,
    InvalidInputError, # Potentially useful, though not used in this revision
)
from repositories.file_storage import FileStorageRepository
from services.codemap_service import CodemapService

logger = logging.getLogger(__name__)

@wrap_service_methods # Applied decorator
class ActorGeneratorService:
    _URL: str = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL: str = "meta-llama/llama-4-maverick:free" # Example, ensure it's a good JSON model

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

    # Removed local ConfigError and UpstreamError classes

    def __init__(self) -> None:
        self.api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
        self.model: str = os.getenv("ACTOR_MODEL", self._DEFAULT_MODEL)
        if not self.api_key:
            # This warning is fine at init; generate_actors will raise ConfigurationError if key is missing during use.
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
            # Raise standardized ConfigurationError
            raise ConfigurationError("OPENROUTER_API_KEY is not set on the server.")

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
            "max_tokens": 1024, # Increased slightly for potentially complex actor lists
            "response_format": {"type": "json_schema", "json_schema": self._SCHEMA},
            "structured_outputs": True,
        }
        headers: Dict[str, str] = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("HTTP_REFERER", "http://localhost"), # Add a default referer
            "X-Title": os.getenv("X_TITLE", "CodeToPromptGenerator"),      # Add a default title
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(self._URL, json=payload, headers=headers)
                response.raise_for_status() # Will raise HTTPStatusError for 4xx/5xx
        except httpx.TimeoutException as exc:
            logger.error("Timeout calling OpenRouter for actor generation: %s", exc)
            raise UpstreamServiceError("OpenRouter request timed out") from exc
        except httpx.RequestError as exc: # Covers ConnectError, ReadError, etc.
            logger.error("Request error calling OpenRouter for actor generation: %s", exc)
            raise UpstreamServiceError(f"Could not connect to OpenRouter: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            error_detail = "Unknown error"
            try:
                error_response_json = exc.response.json()
                error_detail = error_response_json.get("error", {}).get("message", exc.response.text)
            except json.JSONDecodeError:
                error_detail = exc.response.text
            logger.error(
                "HTTP error from OpenRouter (%s) for actor generation: %.200s",
                exc.response.status_code,
                error_detail
            )
            raise UpstreamServiceError(
                f"OpenRouter API error ({exc.response.status_code}): {error_detail}"
            ) from exc

        try:
            data = response.json()
            if not isinstance(data, dict) or "choices" not in data or not data["choices"]:
                logger.error("Invalid response structure from OpenRouter (actor generation): %s", data)
                raise UpstreamServiceError("Invalid response structure from OpenRouter (actor generation)")
            
            choice = data["choices"][0]
            if not isinstance(choice, dict) or "message" not in choice:
                logger.error("Invalid 'choice' structure in OpenRouter response: %s", choice)
                raise UpstreamServiceError("Invalid 'choice' structure in OpenRouter response")

            message = choice.get("message", {})
            if not isinstance(message, dict) or "content" not in message:
                logger.error("Invalid 'message' structure in OpenRouter choice: %s", message)
                raise UpstreamServiceError("Invalid 'message' structure in OpenRouter choice")

            content = message.get("content", "").strip()
            if not content: # Handle empty content string from LLM
                logger.warning("LLM returned empty content for actor generation.")
                raise UpstreamServiceError("LLM returned empty content.")

        except json.JSONDecodeError as exc: # If response.json() itself fails
            logger.error("Failed to parse main OpenRouter JSON response: %s. Response text: %.200s", exc, response.text)
            raise UpstreamServiceError(f"Malformed JSON response from OpenRouter gateway. Status: {response.status_code}") from exc
        except Exception as exc: # Catch other potential errors during parsing of main response
            logger.error("Failed to parse OpenRouter response: %s", exc)
            raise UpstreamServiceError("Unexpected error parsing OpenRouter response.") from exc
        
        logger.debug("Raw LLM content for actors: %.500s", content) # Log the content before parsing

        try:
            # The content string itself is expected to be a JSON string by the schema
            obj = json.loads(content) 
            actors_data = obj.get("actors")
            if not isinstance(actors_data, list):
                logger.error("LLM content missing 'actors' array or it's not a list. Content: %.200s", content)
                raise ValueError("LLM content missing 'actors' array or not a list.")
        except json.JSONDecodeError as exc:
            logger.error("Failed to decode actors JSON from LLM content: %s. Content: %.500s", exc, content)
            raise UpstreamServiceError(f"Failed to parse JSON from model's message. Error: {exc}. Content prefix: {content[:200]}...") from exc
        except ValueError as exc: # Catch our specific ValueError for missing 'actors'
            raise UpstreamServiceError(str(exc)) from exc

        # Add IDs if missing (though schema doesn't define ID, frontend might expect it)
        # This part should ideally be handled by the schema or how actors are stored/used.
        # For now, we'll keep the ID assignment if it's helpful for frontend.
        processed_actors: List[Dict[str, Any]] = []
        for i, actor_item_raw in enumerate(actors_data, 1):
            if isinstance(actor_item_raw, dict):
                # Basic validation against expected keys from schema
                actor_item = {
                    "name": actor_item_raw.get("name"),
                    "role": actor_item_raw.get("role"),
                    "permissions": actor_item_raw.get("permissions", []),
                    "goals": actor_item_raw.get("goals", [])
                }
                if not actor_item["name"] or not actor_item["role"]:
                    logger.warning("Skipping actor due to missing name or role: %s", actor_item_raw)
                    continue
                actor_item["id"] = i # Assign a temporary ID
                processed_actors.append(actor_item)
            else:
                logger.warning("Skipping non-dict item in actors list: %s", actor_item_raw)

        if not processed_actors and actors_data: # If all items were invalid
             raise UpstreamServiceError("Model returned actor data, but none were valid.")
        
        return processed_actors, content


    # ---------------------------------------------------------------- helpers
    def _build_prompt(self, req: ActorGenerateRequest) -> str:
        tree_block = self._tree_text(req.treePaths)
        graph_block = self._build_graph(req)
        readme_block = self._read_readme(req.baseDir)
        guide = (
            "You are an expert at identifying actors (personas, users, roles, or external systems) "
            "that interact with a software project. Analyze the provided project context carefully.\n"
            "Product Context:\n"
            "The project is a 'Code to Prompt Generator' tool. It allows software developers to select files from their local codebase, "
            "write meta-instructions (like persona, output format) and main instructions (the specific task for the LLM), "
            "and then combines these with the content of selected files to generate a comprehensive prompt for a Large Language Model (LLM). "
            "The tool features project tree navigation, file selection with token counts, exclusion management (global and per-project), "
            "meta prompt saving/loading, AI-powered smart file selection, AI-powered prompt refinement, "
            "and integrated task management (Kanban, To-Do, User Stories).\n\n"
            "Follow this step-by-step guide to identify actors:\n"
            "1. Understand the product context (software tool for developers to generate LLM prompts from code).\n"
            "2. Identify primary users (e.g., different types of developers, QA engineers, product managers if they use it for prompt generation for documentation) and any external systems it interacts with (e.g., LLM APIs, file system).\n"
            "3. For each identified actor, extract its name, define its primary role in relation to the 'Code to Prompt Generator'.\n"
            "4. List key permissions or actions each actor can perform *within this specific tool*.\n"
            "5. List primary goals or problems each actor solves *using this specific tool*.\n"
            "Focus *only* on actors directly relevant to the 'Code to Prompt Generator' tool itself. "
            "Aim for 2-4 distinct, high-level actors. Avoid overly granular roles unless clearly distinct in function within the tool."
        )
        return (
            f"{guide}\n\n"
            f"### README (if available)\n{readme_block}\n\n"
            f"### Project Tree (Abbreviated)\n{tree_block}\n\n"
            f"### File Graph (Key File Summaries)\n{graph_block}\n\n"
            "Based on all the above, provide the list of actors in the specified JSON format."
        )

    def _read_readme(self, base_dir: Optional[str]) -> str:
        if not base_dir:
            return "N/A"
        for name in ("README.md", "readme.md", "Readme.md"):
            path = os.path.join(base_dir, name)
            if os.path.isfile(path):
                try:
                    txt = self._storage.read_text(path) or ""
                    txt = txt.strip()[: self._README_MAX_CHARS]
                    if len(txt) < self._README_MAX_CHARS:
                        return txt if txt else "N/A (README is empty)"
                    return txt + "\n... (README truncated)"
                except Exception as exc:
                    logger.warning("Failed to read README %s: %s", path, exc)
                    return "N/A (Error reading README)"
        return "N/A (README not found)"

    def _tree_text(self, paths: List[str]) -> str:
        if not paths:
            return "N/A (Project tree not provided or empty)"
        out: List[str] = []
        for rel in paths[: self._TREE_MAX_LINES]:
            depth = rel.count("/")
            out.append("  " * depth + "• " + rel.rsplit("/", 1)[-1])
        if len(paths) > self._TREE_MAX_LINES:
            out.append(f"… (+{len(paths) - self._TREE_MAX_LINES} more files, truncated)")
        return "\n".join(out)

    def _build_graph(self, req: ActorGenerateRequest) -> str:
        if not req.baseDir or not os.path.isdir(req.baseDir) or not req.treePaths:
            return "N/A (File summaries not available)"
        
        # Heuristic: select a few key files for summary (e.g., entry points, core services)
        # This is a simplified approach. A more advanced one would involve more context.
        key_files_heuristics = ["main.py", "app.py", "index.ts", "index.js", "service.py", "controller.py", "store.ts", "hook.ts"]
        paths_for_summary = [p for p in req.treePaths if any(hf in p.lower() for hf in key_files_heuristics)]
        if not paths_for_summary and req.treePaths: # Fallback if no heuristic match
            paths_for_summary = req.treePaths[:5] # Summarize first 5 files
        else:
            paths_for_summary = paths_for_summary[:5] # Limit to 5 key files

        if not paths_for_summary:
            return "N/A (No key files identified for summary)"

        blocks: List[str] = []
        used_tokens = 0
        for rel in paths_for_summary:
            abs_path = os.path.normpath(os.path.join(req.baseDir, rel))
            if not os.path.isfile(abs_path):
                continue
            summary = self._file_summary(abs_path, rel)
            if summary == "N/A (Error extracting summary)": # Skip problematic files
                continue

            est_tokens = len(summary) // 4 # Rough estimate
            if used_tokens + est_tokens > self._TOKEN_HARD_LIMIT // 3: # Limit graph block size
                blocks.append("... (File graph summaries truncated due to size limit)")
                break
            lang = pathlib.Path(abs_path).suffix.lstrip(".") or "txt"
            blocks.append(
                f'<file path="{rel}" lang="{lang}">\n```{lang}\n{summary}\n```\n</file>'
            )
            used_tokens += est_tokens
        return "\n\n".join(blocks) if blocks else "N/A (Could not generate file summaries)"

    def _file_summary(self, abs_path: str, rel_path: str) -> str:
        try:
            # Using base directory of the file for codemap extraction
            file_dir = os.path.dirname(abs_path)
            file_name = os.path.basename(abs_path)
            codemap = self._codemap.extract_codemap(file_dir, [file_name])
            data = codemap.get(file_name)
        except Exception as exc:
            logger.warning("Codemap extraction failed for %s: %s", rel_path, exc)
            return "N/A (Error extracting summary)" # Return specific string for error
        
        if data and "error" not in data:
            parts: List[str] = []
            cls = data.get("classes")
            if isinstance(cls, list) and cls:
                parts.append(f"Classes: {', '.join(cls[:5])}") # Limit displayed items
            fns = data.get("functions")
            if isinstance(fns, list) and fns:
                parts.append(f"Functions: {', '.join(fns[:8])}") # Limit displayed items
            refs = data.get("references")
            if isinstance(refs, list) and refs:
                parts.append(f"Key Refs: {', '.join(refs[:10])}") # Limit displayed items
            if parts:
                s = "; ".join(parts)
                return s[: self._SUMMARY_MAX_CHARS] if len(s) > self._SUMMARY_MAX_CHARS else s
            return "No key symbols found."
        elif data and data.get("error"):
            return f"N/A (Summary error: {data.get('error')})"
        
        # Fallback if codemap fails or returns no data (should be rare with new error handling)
        text = self._storage.read_text(abs_path) or ""
        return self._cheap_summary(text)


    def _cheap_summary(self, text: str, max_len: int = _SUMMARY_MAX_CHARS) -> str:
        if not text:
            return "File is empty."
        # Basic summary: first few lines
        summary_lines = text.splitlines()[:5]
        summary = "\n".join(summary_lines).strip()
        return summary[:max_len] if len(summary) > max_len else summary