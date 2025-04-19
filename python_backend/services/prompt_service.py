# FILE: python_backend/services/prompt_service.py
# UPDATED: Accept tree_text and include it in the LLM prompt
import os
import logging
import httpx
import json
from typing import Dict, Optional # Import Optional

logger = logging.getLogger(__name__)

class PromptService:
    """Handles interactions related to prompt generation/refinement."""

    _URL = "https://openrouter.ai/api/v1/chat/completions"
    _DEFAULT_MODEL = "google/gemma-3-27b-it:free"

    class UpstreamError(RuntimeError): ...
    class ConfigError(RuntimeError): ...

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = os.getenv("REFINE_MODEL", self._DEFAULT_MODEL)
        logger.info(f"PromptService initialized with model: {self.model}")
        if not self.api_key:
            logger.warning("PromptService initialized WITHOUT OpenRouter API Key. Refinement will fail.")

    # Updated signature to accept optional tree_text
    def refine_prompt(self, text: str, tree_text: Optional[str] = None, timeout: float = 30.0) -> str:
        """
        Uses an LLM via OpenRouter to refine the input text into a well-written English prompt.
        Optionally uses the provided file tree text for additional context.
        Reads API Key and Model from environment variables.
        """
        if not text.strip():
            raise ValueError("Input text cannot be empty.")
        if not self.api_key:
            raise self.ConfigError("Server configuration error: OPENROUTER_API_KEY not available for prompt refinement.")

        system_prompt = (
            "You are an expert prompt engineer. Your task is to convert the user's input text "
            "into a concise, clear, and effective prompt suitable for instructing a large language model (LLM). "
            "The final output prompt MUST be in English, regardless of the input language. "
            "Focus on clarity, conciseness, and actionable instructions. Remove any conversational filler. "
            "If project structure context is provided, use it to enhance the clarity and relevance of the prompt. "
            "Return ONLY the refined prompt text, without any preamble or explanation."
        )

        # Build user prompt, including tree context if available
        user_prompt_parts = [f"Refine the following text into a well-written LLM prompt (output must be English):\n\nInput Text:\n```\n{text}\n```"]
        if tree_text and tree_text.strip():
            # Limit tree text length to avoid excessive prompt size (adjust limit as needed)
            max_tree_chars = 20000
            truncated_tree_text = tree_text.strip()[:max_tree_chars]
            if len(tree_text.strip()) > max_tree_chars:
                truncated_tree_text += "\n... (tree truncated)"
            user_prompt_parts.append(f"\n\nConsider this project structure for context:\n```text\n{truncated_tree_text}\n```")
        user_prompt = "\n".join(user_prompt_parts)


        payload = {
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
            "HTTP-Referer": "http://localhost:3010", # Adjust if needed
            "X-Title": "CodeToPromptGenerator",
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(self._URL, json=payload, headers=headers)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            logger.error("Timeout error calling OpenRouter for refinement: %s", exc)
            raise self.UpstreamError("OpenRouter request timed out.") from exc
        except httpx.RequestError as exc:
            logger.error("Request error calling OpenRouter for refinement: %s", exc)
            raise self.UpstreamError(f"Could not connect to OpenRouter: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            try:
                error_data = exc.response.json()
                error_detail = error_data.get("error", {}).get("message", exc.response.text)
            except json.JSONDecodeError:
                error_detail = exc.response.text
            logger.error("HTTP error from OpenRouter refinement (%s): %s", exc.response.status_code, error_detail[:200])
            raise self.UpstreamError(f"OpenRouter API error ({exc.response.status_code}): {error_detail}") from exc
        except Exception as exc:
             logger.error("Unexpected error during OpenRouter refinement request: %s", exc)
             raise self.UpstreamError(f"An unexpected error occurred while contacting the refinement service: {exc}") from exc

        try:
            data = response.json()
            if not isinstance(data, dict) or "choices" not in data or not isinstance(data["choices"], list) or len(data["choices"]) == 0:
                 raise self.UpstreamError("Invalid response structure from OpenRouter: 'choices' array missing or empty.")

            choice = data["choices"][0]
            if not isinstance(choice, dict) or "message" not in choice or not isinstance(choice["message"], dict) or "content" not in choice["message"]:
                 raise self.UpstreamError("Invalid response structure from OpenRouter: 'message' or 'content' missing.")

            refined_text = choice["message"]["content"].strip()

            # Clean up potential markdown/quotes
            if refined_text.startswith('"') and refined_text.endswith('"'):
                refined_text = refined_text[1:-1].strip()
            if refined_text.startswith("'") and refined_text.endswith("'"):
                refined_text = refined_text[1:-1].strip()
            if refined_text.startswith("```") and refined_text.endswith("```"):
                 start_index = refined_text.find('\n') + 1
                 end_index = refined_text.rfind('\n')
                 if start_index > 0 and end_index > start_index:
                     refined_text = refined_text[start_index:end_index].strip()

            return refined_text
        except json.JSONDecodeError as exc:
            logger.error("Failed to decode JSON response from OpenRouter refinement: %s", exc)
            raise self.UpstreamError("Invalid JSON response received from OpenRouter.") from exc
        except (KeyError, IndexError, TypeError) as exc:
            logger.error("Failed to parse expected fields from OpenRouter refinement response: %s", exc)
            raise self.UpstreamError("Unexpected response format from OpenRouter.") from exc