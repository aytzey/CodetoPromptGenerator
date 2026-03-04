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
import time
import unicodedata
from collections import Counter
from functools import lru_cache
from math import log
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import httpx

from models.autoselect_request import AutoSelectRequest
from services.service_exceptions import wrap_service_methods
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
@wrap_service_methods
class AutoselectService:
    _OPENROUTER_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    _GOOGLE_URL_TMPL: str = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    _DEFAULT_MODEL: str = "meta-llama/llama-4-maverick"
    _DEFAULT_GOOGLE_MODEL: str = "gemini-3-flash-preview"
    _GOOGLE_MODEL_ALIASES: Dict[str, str] = {
        "gemini-3-flash-preview": "gemini-3-flash-preview",
        "gemini-3.0-flash-preview": "gemini-3-flash-preview",
        "models/gemini-3-flash-preview": "gemini-3-flash-preview",
        "models/gemini-3.0-flash-preview": "gemini-3-flash-preview",
    }
    _MAX_RETRIES: int = 3
    _RETRY_DELAY_SECONDS: int = 2

    # Strict JSON schema expected from the model
    _SCHEMA: Dict[str, Any] = {
        "name": "selected_paths",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "selected": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["selected"],
            "additionalProperties": False,
        },
    }

    # Prompt-building tunables
    _TOKEN_HARD_LIMIT: int = 45_000           # Max tokens we’re willing to send
    _SUMMARY_MAX_CHARS: int = 10_000          # Max characters in a one-file summary
    _TREE_MAX_LINES: int = 5_000              # Truncate huge project trees earlier
    _MAX_CANDIDATE_POOL: int = 420
    _LLM_SHORTLIST_INPUT_LIMIT: int = 260
    _LLM_SHORTLIST_SUMMARY_CHARS: int = 220
    _LLM_SHORTLIST_SCAN_CHARS: int = 4_000
    _LLM_SHORTLIST_MAX_OUTPUT_TOKENS: int = 2_200
    _STOPWORDS: Set[str] = {
        "the", "and", "for", "with", "from", "into", "this", "that", "your", "our",
        "about", "have", "has", "are", "use", "using", "make", "build", "need",
        "read", "file", "files", "code", "project", "repository", "repo", "please",
        "only", "just", "show", "give", "want", "help", "task",
        "ve", "ile", "icin", "ama", "bir", "bu", "su", "cok", "daha", "gibi",
        "her", "sey", "sadece", "hic", "ya", "mi", "mu", "mukemmel", "olsun", "yap",
    }
    _TURKISH_CHAR_MAP = str.maketrans({
        "ç": "c",
        "ğ": "g",
        "ı": "i",
        "ö": "o",
        "ş": "s",
        "ü": "u",
    })
    _IRRELEVANT_SEGMENTS: Set[str] = {
        "node_modules",
        ".next",
        "dist",
        "build",
        "coverage",
        "venv",
        ".venv",
        "__pycache__",
        ".git",
        "out",
        "artifacts",
        "outputs",
        "logs",
        ".cache",
        ".tox",
        ".mypy_cache",
        ".pytest_cache",
        "htmlcov",
    }

    # Extensions that are almost never source code — filtered before LLM call
    _NON_CODE_EXTENSIONS: Set[str] = {
        ".log", ".csv", ".tsv", ".pid", ".lock",
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".bmp", ".webp",
        ".woff", ".woff2", ".ttf", ".eot", ".otf",
        ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
        ".bin", ".exe", ".dll", ".so", ".dylib",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
        ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac",
        ".db", ".sqlite", ".sqlite3",
        ".pyc", ".pyo", ".class", ".o", ".obj",
        ".parquet", ".feather", ".hdf5", ".h5",
        ".pkl", ".pickle", ".joblib",
        ".bak", ".tmp", ".swp", ".swo",
        ".map", ".min.js", ".min.css",
        ".md", ".rst", ".txt",
    }

    # Directory names that contain data/artifacts, not source code
    _DATA_DIRECTORY_SEGMENTS: Set[str] = {
        "data", "datasets", "samples", "fixtures",
        "migrations", "seeds",
    }

    # ------------------------------------------------------------------ init
    def __init__(self) -> None:
        self.openrouter_api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
        self.google_api_key: Optional[str] = os.getenv("GOOGLE_API_KEY")
        self.model: str = os.getenv("AUTOSELECT_MODEL", self._DEFAULT_MODEL)
        self.google_model: str = os.getenv("GOOGLE_AUTOSELECT_MODEL", self._DEFAULT_GOOGLE_MODEL)

        if not self.openrouter_api_key and not self.google_api_key:
            logger.warning(
                "AutoselectService started WITHOUT LLM API key (OpenRouter/Google) – "
                "autoselect calls will fail."
            )

        self._storage = FileStorageRepository()
        self._codemap = CodemapService(storage_repo=self._storage)
        self._unavailable_google_models: Set[str] = set()

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
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> Tuple[List[str], str, Optional[Dict[str, Dict[str, Any]]]]:
        """
        Call OpenRouter with a project-graph prompt and post-process its reply.

        Parameters
        ----------
        request_obj
            Pydantic-validated payload from the controller.
        timeout
            Network timeout in **seconds**.
        return_debug
            If *True* the third tuple element contains a mapping
            ``{ rel_path: CodemapInfo | {"error": …} }``.

        Returns
        -------
        (selected_paths, raw_llm_reply, codemap_debug | None)
        """
        self._debug_map.clear()
        provider, resolved_key, resolved_model = self._resolve_runtime_llm_config(api_key, model)

        allowed_paths = self._normalise_allowed_paths(
            request_obj.treePaths,
            request_obj.baseDir,
        )
        if not allowed_paths:
            return [], "", dict(self._debug_map) if return_debug else None

        candidate_paths = self._build_candidate_pool(
            instructions=request_obj.instructions,
            allowed_paths=allowed_paths,
            base_dir=request_obj.baseDir,
            provider=provider,
            api_key=resolved_key,
            model=resolved_model,
            timeout=timeout,
        )

        prompt: str = self._build_prompt(request_obj, candidate_paths=candidate_paths)

        logger.debug("▶︎ Autoselect prompt (first 1 000 chars)\n%s", prompt[:1_000])
        messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    "You are a strict JSON generator. "
                    "Return ONLY the JSON matching this schema: "
                    '{"selected":["relative/path/file.ext"]}.'
                ),
            },
            {"role": "user", "content": prompt},
        ]

        try:
            raw_reply = self._call_llm_for_autoselect(
                provider=provider,
                api_key=resolved_key,
                model=resolved_model,
                messages=messages,
                timeout=timeout,
            )
        except UpstreamError:
            raise
        except Exception as exc:
            logger.error("Unexpected LLM failure in autoselect: %s", exc)
            raise UpstreamError(str(exc)) from exc

        logger.debug("↩ %s autoselect (trimmed): %s", provider, raw_reply[:350].replace("\n", " ⏎ "))

        parsed_json: Any = self._extract_json(raw_reply)

        if parsed_json is not None:
            selected = self._normalise_parsed(parsed_json, candidate_paths)
        else:
            selected = self._legacy_parse(raw_reply, candidate_paths)

        selected = self._finalize_selection(selected, candidate_paths)
        if not selected and candidate_paths:
            retry_reply, retry_selected = self._retry_empty_selection(
                provider=provider,
                api_key=resolved_key,
                model=resolved_model,
                prompt=prompt,
                candidate_paths=candidate_paths,
                timeout=timeout,
            )
            if retry_selected:
                raw_reply = retry_reply
                selected = self._finalize_selection(retry_selected, candidate_paths)

        if not selected and candidate_paths:
            selected = list(candidate_paths)

        if return_debug:
            # Return a *copy* so callers can mutate safely
            return selected, raw_reply, dict(self._debug_map)

        return selected, raw_reply, None

    def _call_llm_for_autoselect(
        self,
        *,
        provider: str,
        api_key: str,
        model: str,
        messages: List[Dict[str, str]],
        timeout: float,
        max_output_tokens: int = 256,
    ) -> str:
        if provider == "google":
            return self._call_google_autoselect(
                messages=messages,
                api_key=api_key,
                model=model,
                timeout=timeout,
                max_output_tokens=max_output_tokens,
            )
        return self._call_openrouter_autoselect(
            messages=messages,
            api_key=api_key,
            model=model,
            timeout=timeout,
            max_output_tokens=max_output_tokens,
        )

    def _call_openrouter_autoselect(
        self,
        *,
        messages: List[Dict[str, str]],
        api_key: str,
        model: str,
        timeout: float,
        max_output_tokens: int,
    ) -> str:
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": 0.0,
            "max_tokens": max_output_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": self._SCHEMA,
            },
            "structured_outputs": True,
        }
        headers: Dict[str, str] = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                rsp = client.post(self._OPENROUTER_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("Transport error calling OpenRouter: %s", exc)
            raise UpstreamError("OpenRouter unreachable") from exc

        if rsp.status_code != 200:
            logger.warning(
                "OpenRouter autoselect error %s → %.200s",
                rsp.status_code,
                rsp.text,
            )
            raise UpstreamError(f"OpenRouter HTTP {rsp.status_code}: {rsp.text[:200]}")

        return self._parse_openrouter_content(rsp)

    def _call_google_autoselect(
        self,
        *,
        messages: List[Dict[str, str]],
        api_key: str,
        model: str,
        timeout: float,
        max_output_tokens: int,
    ) -> str:
        system_parts, user_parts = self._split_messages_for_google(messages)

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": user_parts,
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": max_output_tokens,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "object",
                    "properties": {
                        "selected": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["selected"],
                },
            },
        }
        if system_parts:
            payload["systemInstruction"] = {"parts": system_parts}

        last_error: Optional[Exception] = None
        for candidate_model in self._google_model_candidates(model):
            url = self._GOOGLE_URL_TMPL.format(model=candidate_model)
            logger.info("AutoselectService using Google model candidate: %s", candidate_model)

            for attempt in range(self._MAX_RETRIES):
                try:
                    with httpx.Client(timeout=timeout) as client:
                        rsp = client.post(
                            url,
                            params={"key": api_key},
                            json=payload,
                            headers={"Content-Type": "application/json"},
                        )

                    if rsp.status_code == 200:
                        logger.debug(
                            "Google raw response (first 500 chars): %s",
                            rsp.text[:500],
                        )
                        return self._parse_google_content(rsp)

                    detail = self._extract_google_error_detail(rsp)
                    if self._is_google_model_error(rsp.status_code, detail):
                        self._unavailable_google_models.add(candidate_model)
                        raise UpstreamError(
                            "Google model "
                            f"'{candidate_model}' is unavailable for generateContent: {detail}. "
                            "Use model code 'gemini-3-flash-preview' "
                            "with endpoint /v1beta/models/{model}:generateContent."
                        )

                    if 500 <= rsp.status_code < 600:
                        last_error = UpstreamError(
                            f"Google API server error ({rsp.status_code}): {detail}"
                        )
                    else:
                        raise UpstreamError(
                            f"Google API error ({rsp.status_code}): {detail}"
                        )
                except (httpx.TimeoutException, httpx.RequestError) as exc:
                    logger.warning(
                        "Attempt %d/%d: Retriable Google autoselect network error: %s",
                        attempt + 1,
                        self._MAX_RETRIES,
                        exc,
                    )
                    last_error = exc

                if attempt < self._MAX_RETRIES - 1:
                    time.sleep(self._RETRY_DELAY_SECONDS * (attempt + 1))

            if isinstance(last_error, UpstreamError):
                raise last_error

        if not self._google_model_candidates(model):
            raise UpstreamError(
                "Google model is marked unavailable in this process. "
                "Expected model code is 'gemini-3-flash-preview'."
            )

        if last_error:
            raise UpstreamError(
                f"Failed to contact Google Gemini after {self._MAX_RETRIES} attempts."
            ) from last_error
        raise UpstreamError(
            "No usable Google Gemini model found. "
            "Expected model code is 'gemini-3-flash-preview'."
        )

    @staticmethod
    def _parse_openrouter_content(response: httpx.Response) -> str:
        try:
            data = response.json()
            return str(data["choices"][0]["message"]["content"])
        except Exception as exc:
            logger.error("Failed to parse OpenRouter response: %s", exc)
            raise UpstreamError("Malformed OpenRouter JSON response") from exc

    @staticmethod
    def _parse_google_content(response: httpx.Response) -> str:
        try:
            data = response.json()
            candidates = data.get("candidates")
            if not isinstance(candidates, list) or not candidates:
                feedback = data.get("promptFeedback")
                if feedback:
                    raise UpstreamError(f"Google response blocked: {feedback}")
                raise UpstreamError("Invalid Google response: 'candidates' missing.")

            candidate = candidates[0]
            finish_reason = candidate.get("finishReason", "")
            if finish_reason in ("SAFETY", "RECITATION", "OTHER"):
                safety = candidate.get("safetyRatings", [])
                logger.warning("Google response blocked (finishReason=%s): %s", finish_reason, safety)
                raise UpstreamError(
                    f"Google blocked the response (reason: {finish_reason}). "
                    "Try rephrasing your instructions."
                )

            content = candidate.get("content", {})
            parts = content.get("parts", [])
            if not isinstance(parts, list):
                raise UpstreamError("Invalid Google response: 'parts' missing.")
            text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
            raw = "".join(text_parts).strip()
            if not raw:
                logger.warning(
                    "Google response text empty. finishReason=%s, candidate=%s, "
                    "full_response_keys=%s, promptFeedback=%s",
                    finish_reason,
                    json.dumps(candidate, ensure_ascii=False)[:1000],
                    list(data.keys()),
                    data.get("promptFeedback"),
                )
                raise UpstreamError(
                    f"Google returned empty text (finishReason: {finish_reason}). "
                    "The model may have been unable to generate output for this input."
                )
            return raw
        except Exception as exc:
            if isinstance(exc, UpstreamError):
                raise
            logger.error("Failed to parse Google response: %s", exc)
            raise UpstreamError("Malformed Google JSON response") from exc

    def _resolve_runtime_llm_config(
        self,
        api_key: Optional[str],
        model: Optional[str],
    ) -> Tuple[str, str, str]:
        explicit_key = (api_key or "").strip()
        if explicit_key:
            provider = self._detect_provider(explicit_key)
            if provider != "google":
                raise ConfigError(
                    "Smart Select accepts only Google Gemini API keys (AIza...). "
                    "OpenRouter keys are not allowed."
                )
            chosen_model = self._default_model_for_provider(provider, model)
            return provider, explicit_key, chosen_model

        if self.google_api_key:
            return "google", self.google_api_key, self._default_model_for_provider("google", model)

        raise ConfigError("No Google API key configured. Provide apiKey (AIza...) or set GOOGLE_API_KEY.")

    def _default_model_for_provider(self, provider: str, requested_model: Optional[str]) -> str:
        if provider == "google":
            candidate = requested_model.strip() if requested_model and requested_model.strip() else self.google_model
            resolved = self._normalise_google_model_name(candidate)
            if resolved != self._DEFAULT_GOOGLE_MODEL:
                raise ConfigError(
                    "Smart Select execution model is fixed to 'gemini-3-flash-preview'. "
                    f"Received '{resolved}'."
                )
            return resolved

        if requested_model and requested_model.strip():
            return requested_model.strip()
        return self.model

    @staticmethod
    def _detect_provider(api_key: str) -> str:
        return "google" if api_key.startswith("AIza") else "openrouter"

    @staticmethod
    def _render_messages_for_google(messages: List[Dict[str, str]]) -> str:
        rendered: List[str] = []
        for message in messages:
            role = str(message.get("role", "user")).upper()
            content = str(message.get("content", "")).strip()
            rendered.append(f"[{role}]\n{content}")
        return "\n\n".join(rendered).strip()

    @staticmethod
    def _split_messages_for_google(
        messages: List[Dict[str, str]],
    ) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
        """Split messages into systemInstruction parts and user content parts."""
        system_parts: List[Dict[str, str]] = []
        user_parts: List[Dict[str, str]] = []
        for msg in messages:
            content = str(msg.get("content", "")).strip()
            if not content:
                continue
            if msg.get("role") == "system":
                system_parts.append({"text": content})
            else:
                user_parts.append({"text": content})
        if not user_parts:
            user_parts.append({"text": ""})
        return system_parts, user_parts

    def _google_model_candidates(self, requested_model: str) -> List[str]:
        model = self._normalise_google_model_name(requested_model)
        if model in self._unavailable_google_models:
            return []
        return [model]

    def _normalise_google_model_name(self, model: str) -> str:
        cleaned = model.strip()
        if not cleaned:
            return self._DEFAULT_GOOGLE_MODEL

        canonical = self._GOOGLE_MODEL_ALIASES.get(cleaned, cleaned)
        if canonical.startswith("models/"):
            canonical = canonical.split("/", 1)[1]
        return canonical

    @staticmethod
    def _extract_google_error_detail(response: httpx.Response) -> str:
        try:
            data = response.json()
            if isinstance(data, dict):
                err = data.get("error")
                if isinstance(err, dict):
                    message = err.get("message")
                    if isinstance(message, str) and message.strip():
                        return message
        except Exception:
            pass
        return response.text.strip() or "Unknown Google API error"

    @staticmethod
    def _is_google_model_error(status_code: int, detail: str) -> bool:
        lowered = detail.lower()
        if status_code == 404:
            return True
        return status_code == 400 and ("model" in lowered and "not found" in lowered)

    @staticmethod
    def _is_probable_file_path(path: str) -> bool:
        p = path.strip().strip("/")
        if not p:
            return False
        name = pathlib.PurePosixPath(p).name.lower()
        if "." in name:
            return True
        return name in {"dockerfile", "makefile", "jenkinsfile", "license", "readme", "readme.md"}

    def _normalise_allowed_paths(self, tree_paths: List[str], base_dir: Optional[str]) -> List[str]:
        seen: Set[str] = set()
        out: List[str] = []
        skipped_non_code = 0

        for raw in tree_paths:
            if not isinstance(raw, str):
                continue
            norm = self._norm(raw)
            if not norm:
                continue

            # Skip non-code files early to save LLM tokens
            ext = pathlib.PurePosixPath(norm).suffix.lower()
            if ext in self._NON_CODE_EXTENSIONS:
                skipped_non_code += 1
                continue

            # Skip paths inside irrelevant or data-only directories
            segments = set(pathlib.PurePosixPath(norm.lower()).parts)
            if segments & self._IRRELEVANT_SEGMENTS:
                skipped_non_code += 1
                continue

            # data/ dirs with non-code content: skip files that aren't .py/.js etc.
            _CODE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".sh", ".bash",
                          ".rb", ".go", ".rs", ".java", ".kt", ".scala", ".c",
                          ".cpp", ".h", ".hpp", ".cs", ".vue", ".svelte"}
            if segments & self._DATA_DIRECTORY_SEGMENTS and ext not in _CODE_EXTS:
                skipped_non_code += 1
                continue

            if base_dir and os.path.isdir(base_dir):
                abs_path = os.path.normpath(os.path.join(base_dir, norm))
                if not os.path.isfile(abs_path):
                    continue
            elif not self._is_probable_file_path(norm):
                continue

            lowered = norm.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            out.append(norm)

        if skipped_non_code:
            logger.info(
                "Filtered %d non-code/artifact files before LLM call (%d candidates remain)",
                skipped_non_code, len(out),
            )
        return out

    @classmethod
    def _fold_text(cls, text: str) -> str:
        lowered = text.casefold().translate(cls._TURKISH_CHAR_MAP)
        normalized = unicodedata.normalize("NFKD", lowered)
        return "".join(ch for ch in normalized if not unicodedata.combining(ch))

    @classmethod
    def _tokenize(cls, text: str, *, min_len: int = 2) -> List[str]:
        folded = cls._fold_text(text)
        return [tok for tok in re.findall(r"[a-z0-9_]+", folded) if len(tok) >= min_len]

    def _instruction_tokens(self, instructions: str) -> List[str]:
        seen: Set[str] = set()
        out: List[str] = []
        for token in self._tokenize(instructions, min_len=2):
            if token in self._STOPWORDS or token in seen:
                continue
            seen.add(token)
            out.append(token)
        return out

    def _path_tokens(self, path: str) -> List[str]:
        with_camel_breaks = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", path)
        return self._tokenize(with_camel_breaks, min_len=2)

    def _idf_map(self, paths: List[str]) -> Dict[str, float]:
        doc_count = max(1, len(paths))
        doc_freq = self._path_token_doc_freq(paths)
        return {
            token: log((doc_count + 1.0) / (freq + 1.0)) + 1.0
            for token, freq in doc_freq.items()
        }

    def _path_token_doc_freq(self, paths: List[str]) -> Counter[str]:
        doc_freq: Counter[str] = Counter()
        for path in paths:
            for token in set(self._path_tokens(path)):
                doc_freq[token] += 1
        return doc_freq

    def _is_runtime_artifact_path(self, path: str) -> bool:
        folded_path = self._fold_text(path)
        segments = set(pathlib.PurePosixPath(folded_path).parts)
        if segments & self._IRRELEVANT_SEGMENTS:
            return True
        ext = pathlib.PurePosixPath(folded_path).suffix.lower()
        if ext in self._NON_CODE_EXTENSIONS:
            return True
        return False

    def _path_relevance_score(
        self,
        path: str,
        *,
        path_tokens: List[str],
        query_tf: Counter[str],
        idf_map: Dict[str, float],
    ) -> float:
        if not path_tokens:
            return -5.0

        doc_tf = Counter(path_tokens)
        if not query_tf:
            score = 0.0
        else:
            score = 0.0
            for token, q_freq in query_tf.items():
                tf = doc_tf.get(token, 0)
                if tf <= 0:
                    continue
                score += q_freq * (1.0 + log(1.0 + tf)) * idf_map.get(token, 1.0)

            # Generic substring similarity (e.g. "select" <-> "autoselect")
            for token, q_freq in query_tf.items():
                if len(token) < 4:
                    continue
                best_overlap = 0.0
                for doc_token in doc_tf:
                    if doc_token == token:
                        continue
                    min_len = min(len(token), len(doc_token))
                    if min_len < 4:
                        continue
                    if token in doc_token or doc_token in token:
                        overlap = min_len / max(len(token), len(doc_token))
                        if overlap > best_overlap:
                            best_overlap = overlap
                if best_overlap > 0:
                    score += q_freq * best_overlap * 0.75 * idf_map.get(token, 1.0)

        if self._is_runtime_artifact_path(path):
            ext = pathlib.PurePosixPath(path).suffix.lower()
            if ext in self._NON_CODE_EXTENSIONS:
                score -= 10.0  # heavy penalty for non-code files
            else:
                score -= 3.0   # moderate penalty for artifact directories
        return score

    def _score_paths(self, instructions: str, paths: List[str]) -> List[Tuple[float, int, int, int, str]]:
        if not paths:
            return []

        query_tokens = self._instruction_tokens(instructions)
        query_tf: Counter[str] = Counter(query_tokens)
        if not query_tf:
            return self._stable_order_without_query_signal(paths)
        idf_map = self._idf_map(paths)

        scored: List[Tuple[float, int, int, int, str]] = []
        for path in paths:
            path_tokens = self._path_tokens(path)
            score = self._path_relevance_score(
                path,
                path_tokens=path_tokens,
                query_tf=query_tf,
                idf_map=idf_map,
            )
            scored.append(
                (
                    score,
                    len(set(path_tokens)),
                    path.count("/"),
                    len(path),
                    path,
                )
            )

        # No lexical path signal from the task: keep structural path order.
        if all(item[0] <= 0.0 for item in scored):
            return self._stable_order_without_query_signal(paths)

        scored.sort(key=lambda item: (-item[0], -item[1], item[2], item[3], item[4]))
        return scored

    def _stable_order_without_query_signal(
        self,
        paths: List[str],
    ) -> List[Tuple[float, int, int, int, str]]:
        preferred = [p for p in paths if not self._is_runtime_artifact_path(p)]
        artifacts = [p for p in paths if self._is_runtime_artifact_path(p)]
        ordered = preferred + artifacts
        return [(0.0, 0, 0, idx, path) for idx, path in enumerate(ordered)]

    def _rank_paths(self, instructions: str, paths: List[str]) -> List[str]:
        scored = self._score_paths(instructions, paths)
        return [item[4] for item in scored]

    def _build_candidate_pool(
        self,
        instructions: str,
        allowed_paths: List[str],
        base_dir: Optional[str] = None,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 20.0,
    ) -> List[str]:
        if not allowed_paths:
            return []

        if len(allowed_paths) <= self._MAX_CANDIDATE_POOL:
            return list(allowed_paths)

        default_pool = allowed_paths[: self._MAX_CANDIDATE_POOL]
        if not provider or not api_key or not model:
            return default_pool

        llm_shortlist = self._llm_shortlist_candidate_pool(
            instructions=instructions,
            allowed_paths=allowed_paths,
            base_dir=base_dir,
            provider=provider,
            api_key=api_key,
            model=model,
            timeout=timeout,
            max_selected=self._MAX_CANDIDATE_POOL,
        )
        return llm_shortlist or default_pool

    def _llm_shortlist_candidate_pool(
        self,
        *,
        instructions: str,
        allowed_paths: List[str],
        base_dir: Optional[str] = None,
        provider: str,
        api_key: str,
        model: str,
        timeout: float,
        max_selected: Optional[int] = None,
    ) -> List[str]:
        if not allowed_paths:
            return []

        limit = max(1, min(max_selected or self._MAX_CANDIDATE_POOL, len(allowed_paths)))
        if len(allowed_paths) <= limit:
            return list(allowed_paths)

        if len(allowed_paths) <= self._LLM_SHORTLIST_INPUT_LIMIT:
            return self._llm_shortlist_candidate_pool_once(
                instructions=instructions,
                allowed_paths=allowed_paths,
                base_dir=base_dir,
                provider=provider,
                api_key=api_key,
                model=model,
                timeout=timeout,
                max_selected=limit,
            )

        chunk_size = max(1, self._LLM_SHORTLIST_INPUT_LIMIT)
        chunks = [
            allowed_paths[idx: idx + chunk_size]
            for idx in range(0, len(allowed_paths), chunk_size)
        ]
        chunk_count = max(1, len(chunks))
        chunk_budget = max(24, (limit // chunk_count) + 20)
        merge_limit = min(len(allowed_paths), limit * 3)

        merged: List[str] = []
        for idx, chunk in enumerate(chunks, start=1):
            selected_chunk = self._llm_shortlist_candidate_pool_once(
                instructions=instructions,
                allowed_paths=chunk,
                base_dir=base_dir,
                provider=provider,
                api_key=api_key,
                model=model,
                timeout=timeout,
                max_selected=min(len(chunk), chunk_budget),
                chunk_label=f"Chunk {idx}/{chunk_count}",
            )
            if not selected_chunk:
                logger.warning(
                    "Candidate-pool shortlist returned empty for %s; aborting further chunk calls.",
                    f"Chunk {idx}/{chunk_count}",
                )
                return []
            merged = self._merge_shortlist_with_ranked(
                llm_shortlist=merged,
                ranked=selected_chunk,
                limit=merge_limit,
            )

        if not merged:
            return []
        if len(merged) <= limit:
            return merged

        reduced = self._llm_reduce_candidate_pool(
            instructions=instructions,
            shortlisted_paths=merged,
            base_dir=base_dir,
            provider=provider,
            api_key=api_key,
            model=model,
            timeout=timeout,
            max_selected=limit,
        )
        if reduced:
            return reduced
        return merged[:limit]

    def _llm_shortlist_candidate_pool_once(
        self,
        *,
        instructions: str,
        allowed_paths: List[str],
        base_dir: Optional[str],
        provider: str,
        api_key: str,
        model: str,
        timeout: float,
        max_selected: int,
        chunk_label: Optional[str] = None,
    ) -> List[str]:
        chunk_prefix = f"### Segment\n{chunk_label}\n\n" if chunk_label else ""
        prompt = (
            "Choose a high-recall candidate set for a later deep code-selection pass.\n"
            "Select by code behavior and architecture, not filename keyword overlap.\n"
            "Candidate lines may include lightweight code-context notes after '::'; use them.\n"
            "For broad tasks preserve coverage across entrypoints, orchestration/routing, services, data/schema, shared types/config, and relevant tests.\n"
            "For specific tasks preserve the direct implementation and the nearby call chain, validation boundaries, and impacted tests.\n"
            "Output JSON only: {\"selected\":[\"relative/path\"]}.\n"
            f"Maximum selected paths: {max_selected}.\n\n"
            f"{chunk_prefix}"
            f"### Task\n{instructions}\n\n"
            f"### Candidate Files\n{self._candidate_pool_prompt_block(allowed_paths, base_dir=base_dir)}"
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a strict JSON generator. "
                    "Return ONLY JSON matching {\"selected\":[\"relative/path/file.ext\"]}."
                ),
            },
            {"role": "user", "content": prompt},
        ]
        try:
            raw = self._call_llm_for_autoselect(
                provider=provider,
                api_key=api_key,
                model=model,
                messages=messages,
                timeout=timeout,
                max_output_tokens=self._LLM_SHORTLIST_MAX_OUTPUT_TOKENS,
            )
        except Exception as exc:
            logger.warning("Candidate-pool LLM shortlist failed: %s", exc)
            return []

        parsed = self._extract_json(raw)
        if parsed is not None:
            selected = self._normalise_parsed(parsed, allowed_paths)
        else:
            selected = self._legacy_parse(raw, allowed_paths)

        return self._finalize_selection(selected, allowed_paths)[:max_selected]

    def _llm_reduce_candidate_pool(
        self,
        *,
        instructions: str,
        shortlisted_paths: List[str],
        base_dir: Optional[str],
        provider: str,
        api_key: str,
        model: str,
        timeout: float,
        max_selected: int,
    ) -> List[str]:
        if not shortlisted_paths:
            return []

        prompt = (
            "Reduce this high-recall shortlist into the final candidate pool for deep code selection.\n"
            "Focus on contextual completeness: pick files required to understand behavior end-to-end.\n"
            "Use code-context notes as primary evidence; do not optimize for filename similarity.\n"
            "Output JSON only: {\"selected\":[\"relative/path\"]}.\n"
            f"Maximum selected paths: {max_selected}.\n\n"
            f"### Task\n{instructions}\n\n"
            f"### Shortlist\n{self._candidate_pool_prompt_block(shortlisted_paths, base_dir=base_dir)}"
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a strict JSON generator. "
                    "Return ONLY JSON matching {\"selected\":[\"relative/path/file.ext\"]}."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        try:
            raw = self._call_llm_for_autoselect(
                provider=provider,
                api_key=api_key,
                model=model,
                messages=messages,
                timeout=timeout,
                max_output_tokens=self._LLM_SHORTLIST_MAX_OUTPUT_TOKENS,
            )
        except Exception as exc:
            logger.warning("Candidate-pool LLM reduce failed: %s", exc)
            return []

        parsed = self._extract_json(raw)
        if parsed is not None:
            selected = self._normalise_parsed(parsed, shortlisted_paths)
        else:
            selected = self._legacy_parse(raw, shortlisted_paths)
        return self._finalize_selection(selected, shortlisted_paths)[:max_selected]

    def _candidate_pool_prompt_block(
        self,
        paths: List[str],
        *,
        base_dir: Optional[str],
    ) -> str:
        if not paths:
            return ""
        if not base_dir or not os.path.isdir(base_dir):
            return self._tree_text(paths)

        out: List[str] = []
        for idx, rel in enumerate(paths[: self._TREE_MAX_LINES], start=1):
            abs_path = os.path.normpath(os.path.join(base_dir, rel))
            hint = self._shortlist_file_hint(abs_path)
            if hint:
                out.append(f"{idx:04d}. {rel} :: {hint}")
            else:
                out.append(f"{idx:04d}. {rel}")
        if len(paths) > self._TREE_MAX_LINES:
            out.append(f"… (+{len(paths) - self._TREE_MAX_LINES} more)")
        return "\n".join(out)

    def _shortlist_file_hint(self, abs_path: str) -> str:
        if not os.path.isfile(abs_path):
            return ""
        try:
            text = self._storage.read_text(abs_path) or ""
        except Exception:
            return ""
        if not text:
            return ""
        summary = self._cheap_summary(
            text[: self._LLM_SHORTLIST_SCAN_CHARS],
            max_len=self._LLM_SHORTLIST_SUMMARY_CHARS,
        )
        return re.sub(r"\s+", " ", summary).strip()

    def _merge_shortlist_with_ranked(
        self,
        *,
        llm_shortlist: List[str],
        ranked: List[str],
        limit: int,
    ) -> List[str]:
        merged: List[str] = []
        seen: Set[str] = set()
        for path in [*llm_shortlist, *ranked]:
            lowered = path.lower()
            if lowered in seen:
                continue
            seen.add(lowered)
            merged.append(path)
            if len(merged) >= limit:
                break
        return merged

    def _retry_empty_selection(
        self,
        *,
        provider: str,
        api_key: str,
        model: str,
        prompt: str,
        candidate_paths: List[str],
        timeout: float,
    ) -> Tuple[str, List[str]]:
        retry_prompt = (
            f"{prompt}\n\n"
            "### Retry Constraint\n"
            "Your previous response produced no valid file path from the candidate list.\n"
            "Return at least one valid path from the candidate list.\n"
            "Do not return an empty array."
        )
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a strict JSON generator. "
                    "Return ONLY JSON matching {\"selected\":[\"relative/path/file.ext\"]}."
                ),
            },
            {"role": "user", "content": retry_prompt},
        ]

        try:
            raw = self._call_llm_for_autoselect(
                provider=provider,
                api_key=api_key,
                model=model,
                messages=messages,
                timeout=timeout,
            )
        except Exception as exc:
            logger.warning("Autoselect retry call failed: %s", exc)
            return "", []

        parsed = self._extract_json(raw)
        if parsed is not None:
            selected = self._normalise_parsed(parsed, candidate_paths)
        else:
            selected = self._legacy_parse(raw, candidate_paths)
        return raw, selected

    def _finalize_selection(
        self,
        selected: List[str],
        candidate_paths: List[str],
    ) -> List[str]:
        if not selected or not candidate_paths:
            return []

        allowed_lower = {path.lower() for path in candidate_paths}
        deduped: List[str] = []
        seen: Set[str] = set()
        for path in selected:
            lowered = path.lower()
            if lowered in seen or lowered not in allowed_lower:
                continue
            seen.add(lowered)
            deduped.append(path)
        return deduped

    def _selection_guidance(self, candidate_count: int) -> str:
        if candidate_count <= 8:
            return f"Candidate set is small ({candidate_count}); selecting 1-{candidate_count} files is acceptable."
        return (
            "For broad tasks, usually select 8-30 files to preserve end-to-end context. "
            "For narrow tasks, usually select 3-15 files along the direct call chain."
        )

    # ───────────────────────────────────── prompt helpers ────────────────────
    def _build_prompt(
        self,
        req: AutoSelectRequest,
        *,
        candidate_paths: Optional[List[str]] = None,
    ) -> str:
        paths = candidate_paths or req.treePaths
        tree_block: str = self._tree_text(paths)
        graph_block: str = self._build_graph(req, paths=paths)
        guidance = self._selection_guidance(len(paths))

        preamble: str = (
            "You are selecting files for another LLM that must solve the task without missing context. "
            "Prioritize behavioral coverage over keyword overlap.\n"
            "Rules:\n"
            "1) Use exact relative paths from the candidate list only; never invent paths.\n"
            "2) Use file-graph summaries as primary evidence; filenames are only secondary hints.\n"
            "3) For broad or ambiguous tasks, include representative files across entrypoints, orchestration/routing, services, data access, shared types/config, and relevant tests.\n"
            "4) For specific tasks, include the target implementation plus direct callers/callees and impacted validation/schema/tests.\n"
            "5) Avoid generated/runtime/vendor artifacts, data files (.log, .csv, .json data, .pkl, .parquet, images), and build outputs unless explicitly part of the task.\n"
            "6) Focus on SOURCE CODE files (.py, .ts, .tsx, .js, .jsx, .css, .html, .yaml config, etc.) that implement behavior.\n"
            f"7) {guidance}\n"
            "Return ONLY those paths inside the required JSON schema: "
            '{"selected":["relative/path/file.ext"]}.\n\n'
        )

        return (
            f"{preamble}"
            f"### Task\n{req.instructions}\n\n"
            f"### Candidate Files\n{tree_block}\n\n"
            f"### File Graph (summaries)\n{graph_block}"
        )

    # ---------- textual tree -------------------------------------------------
    def _tree_text(self, paths: List[str]) -> str:
        """
        Render candidate paths with stable rank numbers.
        """
        out: List[str] = []
        for idx, rel in enumerate(paths[: self._TREE_MAX_LINES], start=1):
            out.append(f"{idx:04d}. {rel}")
        if len(paths) > self._TREE_MAX_LINES:
            out.append(f"… (+{len(paths) - self._TREE_MAX_LINES} more)")
        return "\n".join(out)

    # ---------- graph block (unchanged except for lowered try/except) -------
    def _build_graph(self, req: AutoSelectRequest, *, paths: Optional[List[str]] = None) -> str:
        if not req.baseDir or not os.path.isdir(req.baseDir):
            return ""

        blocks: List[str] = []
        used_tokens: int = 0

        for rel in (paths or req.treePaths):
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

    # ---------- file summary -------------------------------------------------
    @lru_cache(maxsize=2048)
    def _file_summary(self, abs_path: str, rel_path: str) -> str:
        """
        Try codemap extraction first; fall back to a cheap regex summary.
        Always *cache* raw codemap info in ``self._debug_map`` for debugging.
        """
        data: Optional[Dict[str, Union[List[str], str]]] = None
        try:
            # extract_codemap → { basename: CodemapInfo | {"error": …} }
            codemap = self._codemap.extract_codemap(
                os.path.dirname(abs_path), [os.path.basename(abs_path)]
            )
            data = codemap.get(os.path.basename(abs_path))
        except Exception as exc:
            logger.warning("Codemap extraction failed for %s: %s", rel_path, exc)
            data = {"error": "Extraction failed"}

        # Always store for optional debug
        self._debug_map[rel_path] = data or {"error": "no-data"}

        # Build a one-liner summary if we have structured info
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

        # Fallback – cheap regex headlines
        return self._cheap_summary(self._storage.read_text(abs_path) or "")

    def _cheap_summary(self, text: str, max_len: int = _SUMMARY_MAX_CHARS) -> str:
        if not text:
            return ""
        header_re = re.compile(
            r"""
            ^\s*
            (?:class|struct|enum|namespace|def|function|fn|sub |procedure|
               public |private |protected |static )[\s\w:<>,.*&()]+
            |
            ^\s*[\w:<>]+\s+[\w:]+::[\w:]+\s*\(
            |
            ^\s*[\w:<>]+\s+[\w:]+\s*\(
            """,
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

    # ───────────────────────────── json / path utils (same as before) ───────
    _FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]+?)\s*```", re.I)

    def _extract_json(self, text: str) -> Optional[Any]:
        cleaned = text.strip()
        m = self._FENCE_RE.search(cleaned)
        if m:
            cleaned = m.group(1).strip()

        start_array = cleaned.find("[")
        start_obj = cleaned.find("{")
        start = start_array if start_array != -1 else start_obj
        if start_obj != -1 and (start_array == -1 or start_obj < start_array):
            start = start_obj
        if start == -1:
            return None

        cleaned = cleaned[start:]
        try:
            return json.loads(cleaned)
        except Exception:
            return None

    # ---------- normalisation / fuzzy matching (unchanged) ------------------
    @staticmethod
    def _norm(path: str) -> str:
        return pathlib.PurePosixPath(path.lstrip("./\\")).as_posix()

    def _normalise_parsed(self, parsed: Any, allowed: List[str]) -> List[str]:
        if isinstance(parsed, list):
            candidate = parsed
        elif isinstance(parsed, dict):
            for key in ("selected", "paths", "files"):
                val = parsed.get(key)
                if isinstance(val, list):
                    candidate = val
                    break
            else:
                candidate = list(parsed)
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
            if not isinstance(raw, str):
                continue
            cand_norm = self._norm(raw.strip().rstrip(",;")).lower()
            resolved: Optional[str] = None

            if cand_norm in allow_exact:
                resolved = allow_exact[cand_norm]
            if resolved is None:
                pp_cand = pathlib.PurePosixPath(cand_norm)
                if pp_cand.suffix or "." in pp_cand.name:
                    matches = basename_map.get(pp_cand.name.lower(), [])
                    if len(matches) == 1:
                        resolved = matches[0]
            if resolved is None:
                matches = suffix_map.get(cand_norm, [])
                if len(matches) == 1:
                    resolved = matches[0]

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
