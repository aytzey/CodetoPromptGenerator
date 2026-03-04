# FILE: python_backend/services/prompt_service.py
# UPDATED: Implemented a two-stage refinement protocol with retries.
import os
import logging
import httpx
import json
import time
from typing import Dict, Optional, List, Any, Tuple

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

    _OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    _GOOGLE_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    _DEFAULT_MODEL = "meta-llama/llama-4-maverick"
    _DEFAULT_GOOGLE_MODEL = "gemini-3-flash-preview"
    _GOOGLE_MODEL_ALIASES = {
        "gemini-3-flash-preview": "gemini-3-flash-preview",
        "gemini-3.0-flash-preview": "gemini-3-flash-preview",
        "models/gemini-3-flash-preview": "gemini-3-flash-preview",
        "models/gemini-3.0-flash-preview": "gemini-3-flash-preview",
    }

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
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.model = os.getenv("REFINE_MODEL", self._DEFAULT_MODEL)
        self.google_model = os.getenv("GOOGLE_REFINE_MODEL", self._DEFAULT_GOOGLE_MODEL)
        self._unavailable_google_models = set()
        logger.info("PromptService initialised with default model: %s", self.model)
        if not self.openrouter_api_key and not self.google_api_key:
            logger.warning(
                "PromptService initialised WITHOUT LLM API Key (OpenRouter/Google). "
                "Refinement requests will fail."
            )

    # ────────────────────────────────────────────────────────────────────
    # public
    # ────────────────────────────────────────────────────────────────────
    def refine_prompt(
        self,
        text: str,
        tree_text: Optional[str] = None,
        timeout: float = 30.0,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> str:
        """
        Refines a user's text into a concise English LLM prompt using a
        two-stage diagnosis and rewrite process.

        Raises
        ------
        InvalidInputError   – empty input text
        ConfigurationError  – missing API key
        UpstreamServiceError – network / upstream failures
        """
        if not text.strip():
            raise InvalidInputError("Input text cannot be empty.")

        provider, resolved_key, resolved_model = self._resolve_runtime_llm_config(api_key, model)

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
            diagnosis_json_text = self._call_llm_with_retry(
                messages=diagnosis_messages,
                response_format={"type": "json_object"},
                timeout=timeout,
                provider=provider,
                api_key=resolved_key,
                model=resolved_model,
            )
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
            refined_prompt_text = self._call_llm_with_retry(
                messages=rewrite_messages,
                timeout=timeout,
                provider=provider,
                api_key=resolved_key,
                model=resolved_model,
            )
            logger.info("Stage 2: Rewrite completed successfully.")
            return self._clean_markdown(refined_prompt_text)
        except UpstreamServiceError as e:
            logger.error("Stage 2 (Rewrite) failed: %s. Aborting refinement.", e)
            raise UpstreamServiceError(f"Prompt rewrite phase failed: {e}") from e

    # ────────────────────────────────────────────────────────────────────
    # helpers
    # ────────────────────────────────────────────────────────────────────
    def _call_llm_with_retry(
        self,
        messages: List[Dict[str, str]],
        timeout: float,
        provider: str,
        api_key: str,
        model: str,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        if provider == "google":
            return self._call_google_with_retry(
                messages=messages,
                timeout=timeout,
                api_key=api_key,
                model=model,
                response_format=response_format,
            )
        return self._call_openrouter_with_retry(
            messages=messages,
            timeout=timeout,
            api_key=api_key,
            model=model,
            response_format=response_format,
        )

    def _call_openrouter_with_retry(
        self,
        messages: List[Dict[str, str]],
        timeout: float,
        api_key: str,
        model: str,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1024,
        }
        if response_format:
            payload["response_format"] = response_format

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3010",
            "X-Title": "CodeToPromptGenerator",
        }

        last_exception = None
        for attempt in range(self._MAX_RETRIES):
            try:
                with httpx.Client(timeout=timeout) as client:
                    response = client.post(self._OPENROUTER_URL, json=payload, headers=headers)
                    response.raise_for_status()
                    return self._parse_openrouter_content(response)
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
                time.sleep(self._RETRY_DELAY_SECONDS * (attempt + 1))

        raise UpstreamServiceError(f"Failed to contact OpenRouter after {self._MAX_RETRIES} attempts.") from last_exception

    def _call_google_with_retry(
        self,
        messages: List[Dict[str, str]],
        timeout: float,
        api_key: str,
        model: str,
        response_format: Optional[Dict[str, str]] = None,
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
                "temperature": 0.5,
                "maxOutputTokens": 1024,
            },
        }
        if system_parts:
            payload["systemInstruction"] = {"parts": system_parts}
        if response_format and response_format.get("type") == "json_object":
            payload["generationConfig"]["responseMimeType"] = "application/json"

        model_candidates = self._google_model_candidates(model)
        last_error: Optional[Exception] = None

        for candidate_model in model_candidates:
            url = self._GOOGLE_URL_TMPL.format(model=candidate_model)
            logger.info("PromptService using Google model candidate: %s", candidate_model)

            for attempt in range(self._MAX_RETRIES):
                try:
                    with httpx.Client(timeout=timeout) as client:
                        response = client.post(
                            url,
                            params={"key": api_key},
                            json=payload,
                            headers={"Content-Type": "application/json"},
                        )
                    if response.status_code == 200:
                        return self._parse_google_content(response)

                    detail = self._extract_google_error_detail(response)
                    if self._is_google_model_error(response.status_code, detail):
                        self._unavailable_google_models.add(candidate_model)
                        raise UpstreamServiceError(
                            "Google model "
                            f"'{candidate_model}' is unavailable for generateContent: {detail}. "
                            "Use model code 'gemini-3-flash-preview' "
                            "with endpoint /v1beta/models/{model}:generateContent."
                        )
                    if 500 <= response.status_code < 600:
                        last_error = UpstreamServiceError(
                            f"Google API server error ({response.status_code}): {detail}"
                        )
                    else:
                        raise UpstreamServiceError(
                            f"Google API error ({response.status_code}): {detail}"
                        )
                except (httpx.TimeoutException, httpx.RequestError) as exc:
                    logger.warning(
                        "Attempt %d/%d: Retriable Google network error: %s",
                        attempt + 1,
                        self._MAX_RETRIES,
                        exc,
                    )
                    last_error = exc

                if attempt < self._MAX_RETRIES - 1:
                    time.sleep(self._RETRY_DELAY_SECONDS * (attempt + 1))

            if isinstance(last_error, UpstreamServiceError):
                raise last_error

        if not self._google_model_candidates(model):
            raise UpstreamServiceError(
                "Google model is marked unavailable in this process. "
                "Expected model code is 'gemini-3-flash-preview'."
            )

        if last_error:
            raise UpstreamServiceError(
                f"Failed to contact Google Gemini after {self._MAX_RETRIES} attempts."
            ) from last_error
        raise UpstreamServiceError(
            "No usable Google Gemini model found. "
            "Expected model code is 'gemini-3-flash-preview'."
        )

    @staticmethod
    def _parse_openrouter_content(response: httpx.Response) -> str:
        try:
            data = response.json()
            choices = data.get("choices")
            if (
                not isinstance(data, dict)
                or not isinstance(choices, list)
                or not choices
                or not isinstance(choices[0], dict)
            ):
                raise UpstreamServiceError("Invalid OpenRouter response: 'choices' missing.")
            
            raw_content = choices[0].get("message", {}).get("content", "").strip()
            if not raw_content:
                raise UpstreamServiceError("OpenRouter response was empty.")
            return raw_content
        except (json.JSONDecodeError, TypeError, KeyError, IndexError) as exc:
            logger.error("Failed to parse OpenRouter response: %s", exc)
            raise UpstreamServiceError("Malformed JSON response from OpenRouter.") from exc

    @staticmethod
    def _parse_google_content(response: httpx.Response) -> str:
        try:
            data = response.json()
            candidates = data.get("candidates")
            if not isinstance(candidates, list) or not candidates:
                feedback = data.get("promptFeedback")
                if feedback:
                    raise UpstreamServiceError(f"Google response blocked: {feedback}")
                raise UpstreamServiceError("Invalid Google response: 'candidates' missing.")

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not isinstance(parts, list) or not parts:
                raise UpstreamServiceError("Google response had no content parts.")

            text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
            text = "".join(text_parts).strip()
            if not text:
                raise UpstreamServiceError("Google response text was empty.")
            return text
        except (json.JSONDecodeError, TypeError, KeyError, IndexError) as exc:
            logger.error("Failed to parse Google response: %s", exc)
            raise UpstreamServiceError("Malformed JSON response from Google Gemini.") from exc

    def _resolve_runtime_llm_config(
        self,
        api_key: Optional[str],
        model: Optional[str],
    ) -> Tuple[str, str, str]:
        explicit_key = (api_key or "").strip()
        if explicit_key:
            provider = self._detect_provider(explicit_key)
            if provider != "google":
                raise ConfigurationError(
                    "Prompt refine accepts only Google Gemini API keys (AIza...). "
                    "OpenRouter keys are not allowed."
                )
            chosen_model = self._default_model_for_provider(provider, model)
            return provider, explicit_key, chosen_model

        if self.google_api_key:
            return "google", self.google_api_key, self._default_model_for_provider("google", model)

        raise ConfigurationError("No Google API key configured. Provide apiKey (AIza...) or set GOOGLE_API_KEY.")

    def _default_model_for_provider(self, provider: str, requested_model: Optional[str]) -> str:
        if provider == "google":
            candidate = requested_model.strip() if requested_model and requested_model.strip() else self.google_model
            resolved = self._normalise_google_model_name(candidate)
            if resolved != self._DEFAULT_GOOGLE_MODEL:
                raise ConfigurationError(
                    "Prompt refine execution model is fixed to 'gemini-3-flash-preview'. "
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
