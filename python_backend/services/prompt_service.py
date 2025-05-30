# FILE: python_backend/services/prompt_service.py
# UPDATED: Standardised error handling (service_exceptions)
import os
import logging
import httpx
import json
from typing import Dict, Optional

from services.service_exceptions import (
    InvalidInputError,
    UpstreamServiceError,
    ConfigurationError,
    wrap_service_methods,
)

logger = logging.getLogger(__name__)

@wrap_service_methods
class PromptService:
    """Handles interactions related to prompt generation/refinement."""

    _URL = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL = "meta-llama/llama-4-maverick:free"

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = os.getenv("REFINE_MODEL", self._DEFAULT_MODEL)
        logger.info("PromptService initialised with model: %s", self.model)
        if not self.api_key:
            logger.warning(
                "PromptService initialised WITHOUT OpenRouter API Key. "
                "Refinement requests will fail."
            )

    # ────────────────────────────────────────────────────────────────────
    # public
    # ────────────────────────────────────────────────────────────────────
    def refine_prompt(
        self, text: str, tree_text: Optional[str] = None, timeout: float = 30.0
    ) -> str:
        """
        Refine *text* into a concise English LLM prompt.

        Raises
        ------
        InvalidInputError   – empty input text
        ConfigurationError  – missing OPENROUTER_API_KEY
        UpstreamServiceError – network / upstream failures
        """
        if not text.strip():
            raise InvalidInputError("Input text cannot be empty.")
        if not self.api_key:
            raise ConfigurationError(
                "OPENROUTER_API_KEY is not set on the server."
            )

        # ---------- build system + user prompts -------------------------
        system_prompt = (
            "You are an expert prompt engineer. Your task is to convert the user's "
            "input text into a concise, clear, and effective prompt suitable for "
            "a large language model (LLM). The final output must be in English. "
            "Strip chit-chat and file names. Return ONLY the refined prompt."
        )

        user_parts = [
            "Refine the following text (output must be English):\n\nInput:\n```\n"
            f"{text}\n```"
        ]
        if tree_text and tree_text.strip():
            limit = 20_000
            snippet = tree_text.strip()[:limit]
            if len(tree_text.strip()) > limit:
                snippet += "\n... (tree truncated)"
            user_parts.append(
                "\n\nProject tree context:\n```text\n" f"{snippet}\n```"
            )
        user_prompt = "\n".join(user_parts)

        payload: Dict[str, object] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.5,
            "max_tokens": 512,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3010",
            "X-Title": "CodeToPromptGenerator",
        }

        # ---------- HTTP round-trip -------------------------------------
        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(self._URL, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            logger.error("Timeout contacting OpenRouter: %s", exc)
            raise UpstreamServiceError("OpenRouter request timed out.") from exc
        except httpx.RequestError as exc:
            logger.error("Network error contacting OpenRouter: %s", exc)
            raise UpstreamServiceError("Could not connect to OpenRouter.") from exc
        except httpx.HTTPStatusError as exc:
            try:
                detail = exc.response.json().get("error", {}).get(
                    "message", exc.response.text
                )
            except json.JSONDecodeError:
                detail = exc.response.text
            logger.error("HTTP %s from OpenRouter: %.200s", exc.response.status_code, detail)
            raise UpstreamServiceError(
                f"OpenRouter API error ({exc.response.status_code}): {detail}"
            ) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unexpected error contacting OpenRouter.")
            raise UpstreamServiceError(
                f"Unexpected error while contacting OpenRouter: {exc}"
            ) from exc

        # ---------- parse / sanitise reply ------------------------------
        try:
            data = response.json()
            choices = data.get("choices")
            if (
                not isinstance(data, dict)
                or not isinstance(choices, list)
                or not choices
                or not isinstance(choices[0], dict)
            ):
                raise UpstreamServiceError(
                    "Invalid OpenRouter response – 'choices' missing."
                )
            raw = choices[0].get("message", {}).get("content", "").strip()
            return self._clean_markdown(raw)
        except (json.JSONDecodeError, TypeError, KeyError, IndexError) as exc:
            logger.error("Failed to parse OpenRouter response: %s", exc)
            raise UpstreamServiceError("Malformed JSON response from OpenRouter.") from exc

    # ────────────────────────────────────────────────────────────────────
    # helpers
    # ────────────────────────────────────────────────────────────────────
    @staticmethod
    def _clean_markdown(text: str) -> str:
        """Strip common Markdown wrappers from an LLM reply."""
        txt = text
        if txt.startswith('"') and txt.endswith('"'):
            txt = txt[1:-1].strip()
        if txt.startswith("'") and txt.endswith("'"):
            txt = txt[1:-1].strip()
        if txt.startswith("```") and txt.endswith("```"):
            start = txt.find("\n") + 1
            end = txt.rfind("\n")
            if 0 < start < end:
                txt = txt[start:end].strip()
        return txt
