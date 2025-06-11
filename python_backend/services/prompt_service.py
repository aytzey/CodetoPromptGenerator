# FILE: python_backend/services/prompt_service.py
# UPDATED: Implemented a two-stage refinement protocol with retries.
import os
import logging
import httpx
import json
import time
from typing import Dict, Optional, List, Any

from services.service_exceptions import (
    InvalidInputError,
    UpstreamServiceError,
    ConfigurationError,
    wrap_service_methods,
)

logger = logging.getLogger(__name__)

@wrap_service_methods
class PromptService:
    """
    Handles interactions related to prompt generation/refinement using a
    two-stage protocol for diagnosis and rewriting.
    """

    _URL = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL = "meta-llama/llama-4-maverick:free" # Updated for better instruction following

    # --- Protocol Constants ---
    _MAX_RETRIES = 3
    _RETRY_DELAY_SECONDS = 2

    _DIAGNOSIS_PROMPT = """
You are a Senior Prompt Architect. Your mission is to diagnose weaknesses in a draft prompt.
Your task is Phase 1: Rapid Diagnosis.

1.  Summarise the draft prompt's goal and structure in one short paragraph.
2.  Assess each of the following criteria using: Pass, Caution, or Fail. Add a one-line note explaining each rating.
    - Task Fidelity
    - Context Utilisation
    - Accuracy and Verifiability
    - Tone and Persona Consistency
    - Error Handling
    - Resource Efficiency (tokens / latency)
3.  Mark any of these High-Priority Triggers that apply:
    - Context Preservation
    - Intent Refinement
    - Error Prevention

Return ONLY a JSON object with the following structure:
{
  "summary": "The user wants to...",
  "assessment": {
    "task_fidelity": {"rating": "Pass/Caution/Fail", "note": "..."},
    "context_utilisation": {"rating": "Pass/Caution/Fail", "note": "..."}
  },
  "triggers": ["Intent Refinement"]
}
"""

    _REWRITE_PROMPT = """
You are a Senior Prompt Architect. Your mission is to deliver a clearly improved prompt version that stays true to the author's original intent and audience.
Your task is Phase 2: Precision Rewrite.

You will be given a diagnosis of a prompt and the original text.
1.  Apply improvements ONLY where the diagnosis noted 'Caution' or 'Fail'.
2.  Preserve the original purpose, scope, and persona.
3.  Use or introduce a clear, numbered-step structure for the prompt's instructions.
4.  Optimise for brevity and clarity.
5.  If any high-priority triggers were marked in the diagnosis, ensure your rewrite explicitly addresses them.

Return ONLY the final, refined prompt text. Do not include any explanations, markdown code fences, or conversational chit-chat.
"""

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
        Refines a user's text into a concise English LLM prompt using a
        two-stage diagnosis and rewrite process.

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

        # ---------- build base user prompt ------------------------------
        user_prompt_text = self._build_user_prompt_text(text, tree_text)


        # ════════════════════════════════════════════════════════════════
        # STAGE 1: RAPID DIAGNOSIS
        # ════════════════════════════════════════════════════════════════
        logger.info("Executing Stage 1: Diagnosis")
        diagnosis_messages = [
            {"role": "system", "content": self._DIAGNOSIS_PROMPT},
            {"role": "user", "content": user_prompt_text},
        ]
        
        try:
            diagnosis_response = self._call_llm_with_retry(
                messages=diagnosis_messages,
                response_format={"type": "json_object"},
                timeout=timeout
            )
            diagnosis_json_text = self._parse_llm_response_content(diagnosis_response)
            # We don't need to parse the JSON here, just pass the text along.
            # The rewrite model is smart enough to understand the structure.
            logger.info("Stage 1: Diagnosis completed successfully.")
        except UpstreamServiceError as e:
            logger.error("Stage 1 (Diagnosis) failed: %s. Aborting refinement.", e)
            raise UpstreamServiceError(f"Prompt diagnosis phase failed: {e}") from e


        # ════════════════════════════════════════════════════════════════
        # STAGE 2: PRECISION REWRITE
        # ════════════════════════════════════════════════════════════════
        logger.info("Executing Stage 2: Precision Rewrite")
        rewrite_user_content = (
            "Based on the following diagnosis, please refine the original prompt.\n\n"
            "--- DIAGNOSIS ---\n"
            f"{diagnosis_json_text}\n\n"
            "--- ORIGINAL PROMPT TEXT ---\n"
            f"{user_prompt_text}"
        )

        rewrite_messages = [
            {"role": "system", "content": self._REWRITE_PROMPT},
            {"role": "user", "content": rewrite_user_content},
        ]

        try:
            final_response = self._call_llm_with_retry(
                messages=rewrite_messages,
                timeout=timeout
            )
            refined_prompt_text = self._parse_llm_response_content(final_response)
            logger.info("Stage 2: Rewrite completed successfully.")
            return self._clean_markdown(refined_prompt_text)
        except UpstreamServiceError as e:
            logger.error("Stage 2 (Rewrite) failed: %s. Aborting refinement.", e)
            raise UpstreamServiceError(f"Prompt rewrite phase failed: {e}") from e

    # ────────────────────────────────────────────────────────────────────
    # helpers
    # ────────────────────────────────────────────────────────────────────
    def _call_llm_with_retry(
        self, messages: List[Dict[str, str]], timeout: float, response_format: Optional[Dict[str, str]] = None
    ) -> httpx.Response:
        """
        Calls the LLM API with a retry mechanism for transient errors.
        """
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1024,
        }
        if response_format:
            payload["response_format"] = response_format

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3010", # Replace with your actual referer if needed
            "X-Title": "CodeToPromptGenerator",
        }

        last_exception = None
        for attempt in range(self._MAX_RETRIES):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(self._URL, json=payload, headers=headers)
                    response.raise_for_status()
                    return response
            except (httpx.TimeoutException, httpx.RequestError) as exc:
                logger.warning("Attempt %d/%d: Retriable network error: %s", attempt + 1, self._MAX_RETRIES, exc)
                last_exception = exc
            except httpx.HTTPStatusError as exc:
                # Retry on 5xx server errors, but not on 4xx client errors
                if 500 <= exc.response.status_code < 600:
                    logger.warning("Attempt %d/%d: Retriable server error (%d): %s", attempt + 1, self._MAX_RETRIES, exc.response.status_code, exc)
                    last_exception = exc
                else:
                    try:
                        detail = exc.response.json().get("error", {}).get("message", exc.response.text)
                    except json.JSONDecodeError:
                        detail = exc.response.text
                    logger.error("HTTP %s from OpenRouter: %.200s", exc.response.status_code, detail)
                    raise UpstreamServiceError(f"OpenRouter API error ({exc.response.status_code}): {detail}") from exc
            
            if attempt < self._MAX_RETRIES - 1:
                time.sleep(self._RETRY_DELAY_SECONDS * (attempt + 1)) # Exponential backoff

        # If all retries fail
        raise UpstreamServiceError(f"Failed to contact OpenRouter after {self._MAX_RETRIES} attempts.") from last_exception

    @staticmethod
    def _parse_llm_response_content(response: httpx.Response) -> str:
        """Parses the content from a successful LLM API response."""
        try:
            data = response.json()
            choices = data.get("choices")
            if (
                not isinstance(data, dict)
                or not isinstance(choices, list)
                or not choices
                or not isinstance(choices[0], dict)
            ):
                raise UpstreamServiceError("Invalid OpenRouter response – 'choices' missing.")
            
            raw_content = choices[0].get("message", {}).get("content", "").strip()
            if not raw_content:
                raise UpstreamServiceError("OpenRouter response was empty.")
            return raw_content
        except (json.JSONDecodeError, TypeError, KeyError, IndexError) as exc:
            logger.error("Failed to parse OpenRouter response: %s", exc)
            raise UpstreamServiceError("Malformed JSON response from OpenRouter.") from exc

    @staticmethod
    def _build_user_prompt_text(text: str, tree_text: Optional[str]) -> str:
        """Constructs the initial user prompt from text and optional tree context."""
        user_parts = [f"Input text to be refined into a prompt:\n```\n{text}\n```"]
        if tree_text and tree_text.strip():
            limit = 20_000
            snippet = tree_text.strip()[:limit]
            if len(tree_text.strip()) > limit:
                snippet += "\n... (tree truncated)"
            user_parts.append(f"\n\nOptional project tree context:\n```text\n{snippet}\n```")
        return "\n".join(user_parts)

    @staticmethod
    def _clean_markdown(text: str) -> str:
        """Strip common Markdown wrappers from an LLM reply."""
        txt = text
        if txt.startswith('"') and txt.endswith('"'):
            txt = txt[1:-1].strip()
        if txt.startswith("'") and txt.endswith("'"):
            txt = txt[1:-1].strip()
        if txt.startswith("```") and txt.endswith("```"):
            lines = txt.split('\n')
            if len(lines) > 1:
                # Strip the first line if it's just ``` or ```language
                # and the last line if it's ```
                return '\n'.join(lines[1:-1]).strip()
        return txt