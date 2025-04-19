# FILE: python_backend/services/prompt_service.py
# Reads API Key and Model from environment variables.
import os # <-- Import os
import logging
import httpx
import json
from typing import Dict

logger = logging.getLogger(__name__)

class PromptService:
    """Handles interactions related to prompt generation/refinement."""

    _URL = "https://openrouter.ai/api/v1/chat/completions"
    # Default model if not set in environment
    _DEFAULT_MODEL = "google/gemma-3-27b-it:free"

    class UpstreamError(RuntimeError): ...
    class ConfigError(RuntimeError): ... # For missing config

    def __init__(self):
        # Load config from environment variables during initialization
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = os.getenv("REFINE_MODEL", self._DEFAULT_MODEL)

        # Log API key presence (not the key itself) and model being used
        logger.info(f"PromptService initialized with model: {self.model}")
        if not self.api_key:
            logger.warning("PromptService initialized WITHOUT OpenRouter API Key. Refinement will fail.")
            # Don't raise here, let the method call fail if key is needed

    def refine_prompt(self, text: str, timeout: float = 30.0) -> str: # Removed api_key argument
        """
        Uses an LLM via OpenRouter to refine the input text into a well-written English prompt.
        Reads API Key and Model from environment variables.
        """
        if not text.strip():
            raise ValueError("Input text cannot be empty.")

        # Check for API key here, before making the call
        if not self.api_key:
            raise self.ConfigError("Server configuration error: OPENROUTER_API_KEY not available for prompt refinement.")

        system_prompt = (
            "You are an expert prompt engineer. Your task is to convert the user's input text "
            "into a concise, clear, and effective prompt suitable for instructing a large language model (LLM). "
            "The final output prompt MUST be in English, regardless of the input language. "
            "Focus on clarity, conciseness, and actionable instructions. Remove any conversational filler. "
            "Return ONLY the refined prompt text, without any preamble or explanation."
        )
        user_prompt = f"Refine the following text into a well-written LLM prompt (output must be English):\n\nInput Text:\n```\n{text}\n```"

        payload = {
            "model": self.model, # Use model from environment
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.5, # Allow some creativity but keep it focused
            "max_tokens": 512, # Limit output length
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}", # Use API key from environment
            "Content-Type": "application/json",
            # Optional headers might help OpenRouter identify the source
            "HTTP-Referer": "http://localhost:3010", # Adjust if your frontend URL differs
            "X-Title": "CodeToPromptGenerator",
        }

        try:
            # Use httpx context manager for better resource management
            with httpx.Client(timeout=timeout) as client:
                response = client.post(self._URL, json=payload, headers=headers)
                response.raise_for_status() # Raise HTTPStatusError for 4xx/5xx responses
        except httpx.TimeoutException as exc:
            logger.error("Timeout error calling OpenRouter for refinement: %s", exc)
            raise self.UpstreamError("OpenRouter request timed out.") from exc
        except httpx.RequestError as exc:
            logger.error("Request error calling OpenRouter for refinement: %s", exc)
            raise self.UpstreamError(f"Could not connect to OpenRouter: {exc}") from exc
        except httpx.HTTPStatusError as exc:
            # Try to parse error details from response if possible
            try:
                error_data = exc.response.json()
                error_detail = error_data.get("error", {}).get("message", exc.response.text)
            except json.JSONDecodeError:
                error_detail = exc.response.text # Fallback to raw text if JSON parsing fails
            logger.error("HTTP error from OpenRouter refinement (%s): %s", exc.response.status_code, error_detail[:200])
            raise self.UpstreamError(f"OpenRouter API error ({exc.response.status_code}): {error_detail}") from exc
        except Exception as exc: # Catch any other unexpected errors during the request phase
             logger.error("Unexpected error during OpenRouter refinement request: %s", exc)
             raise self.UpstreamError(f"An unexpected error occurred while contacting the refinement service: {exc}") from exc


        try:
            data = response.json()
            # Add more robust checking for the response structure
            if not isinstance(data, dict) or "choices" not in data or not isinstance(data["choices"], list) or len(data["choices"]) == 0:
                 raise self.UpstreamError("Invalid response structure from OpenRouter: 'choices' array missing or empty.")

            choice = data["choices"][0]
            if not isinstance(choice, dict) or "message" not in choice or not isinstance(choice["message"], dict) or "content" not in choice["message"]:
                 raise self.UpstreamError("Invalid response structure from OpenRouter: 'message' or 'content' missing.")

            refined_text = choice["message"]["content"].strip()

            # Sometimes models add quotes or markdown fences, try removing them
            if refined_text.startswith('"') and refined_text.endswith('"'):
                refined_text = refined_text[1:-1].strip()
            if refined_text.startswith("'") and refined_text.endswith("'"):
                refined_text = refined_text[1:-1].strip()
            if refined_text.startswith("```") and refined_text.endswith("```"):
                 # Find the first newline after ``` and the last newline before ```
                 start_index = refined_text.find('\n') + 1
                 end_index = refined_text.rfind('\n')
                 if start_index > 0 and end_index > start_index:
                     refined_text = refined_text[start_index:end_index].strip()


            return refined_text
        except json.JSONDecodeError as exc:
            logger.error("Failed to decode JSON response from OpenRouter refinement: %s", exc)
            raise self.UpstreamError("Invalid JSON response received from OpenRouter.") from exc
        except (KeyError, IndexError, TypeError) as exc: # Catch potential issues accessing nested data
            logger.error("Failed to parse expected fields from OpenRouter refinement response: %s", exc)
            raise self.UpstreamError("Unexpected response format from OpenRouter.") from exc