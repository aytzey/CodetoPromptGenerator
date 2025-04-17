"""
services/autoselect_service.py
──────────────────────────────
Pure service responsible for:

1. Building the Gemma‑3‑12B‑IT prompt.
2. Talking to **openrouter.ai** via *httpx*.
3. Parsing / filtering the model reply.

The controller orchestrates HTTP‑level concerns; this class focuses
solely on business logic ⇒ SRP & DIP (receives API‑key instead of
reading env‑vars directly).
"""

from __future__ import annotations

import logging
import pathlib
from typing import List, Set

import httpx

from models.autoselect_request import AutoSelectRequest

logger = logging.getLogger(__name__)


class AutoselectService:
    """High‑level façade used by :pymod:`autoselect_controller`."""

    # Upstream API -----------------------------------------------------------------
    _OPENROUTER_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    _MODEL_NAME:    str = "google/gemma-3-12b-it:free"

    class UpstreamError(RuntimeError):
        """Raised when OpenRouter replies with a non‑200 or malformed payload."""

    # Public API -------------------------------------------------------------------
    def autoselect_paths(
        self,
        request_obj: AutoSelectRequest,
        api_key: str,
        *,
        timeout: float = 20.0,
    ) -> List[str]:
        """
        Execute the *Autoselect* flow end‑to‑end.

        Parameters
        ----------
        request_obj:
            Parsed & validated body from the controller.
        api_key:
            The **OPENROUTER_API_KEY** received from the controller.
        timeout:
            Socket timeout for the upstream call.

        Returns
        -------
        list[str]
            Normalised, de‑duplicated relative paths selected by the model.

        Raises
        ------
        AutoselectService.UpstreamError
            On network issues, non‑200 status, or unexpected JSON schema.
        """
        prompt   = self._build_prompt(request_obj)
        headers  = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        }
        payload  = {
            "model":       self._MODEL_NAME,
            "messages":    [{"role": "system", "content": prompt}],
            "max_tokens":  256,
            "temperature": 0,
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(self._OPENROUTER_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("OpenRouter connection failed: %s", exc)
            raise self.UpstreamError("Upstream service unreachable.") from exc

        if response.status_code != 200:
            logger.warning("OpenRouter error %s → %s", response.status_code, response.text[:200])
            raise self.UpstreamError(
                f"Upstream returned HTTP {response.status_code}.",  # pragma: no cover
            )

        try:
            content: str = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError) as exc:
            raise self.UpstreamError("Malformed upstream JSON response.") from exc

        return self._postprocess(content, request_obj.treePaths)

    # ----------------------------------------------------------------------- helpers
    @staticmethod
    def _build_prompt(req: AutoSelectRequest) -> str:
        """Render the **system** prompt exactly as required by the spec."""
        files_blob = "\n".join(req.treePaths)
        return (
            "You are given a list of relative file paths for a software project "
            "and the user’s main instructions. Return ONLY the paths that a language "
            "model would need to read in order to fulfil the task.\n\n"
            f"## Instructions\n{req.instructions}\n\n"
            f"## Available files\n{files_blob}"
        )

    @staticmethod
    def _norm(path: str) -> str:
        """Normalise to forward‑slash POSIX form – easier list dedup & compare."""
        return pathlib.PurePosixPath(path.strip()).as_posix()

    def _postprocess(self, raw_reply: str, allowed_paths: List[str]) -> List[str]:
        """
        • Normalise each line in the LLM response.  
        • Keep only items present in *allowed_paths* (case‑sensitive).  
        • Preserve reply order, drop duplicates.
        """
        allowed: Set[str] = {self._norm(p) for p in allowed_paths}

        seen:  Set[str]   = set()
        final: List[str]  = []

        for line in raw_reply.splitlines():
            norm = self._norm(line)
            if norm and norm in allowed and norm not in seen:
                seen.add(norm)
                final.append(norm)

        return final
