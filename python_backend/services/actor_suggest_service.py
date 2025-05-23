# python_backend/services/actor_suggest_service.py
"""Simple actor suggestion service.

This service provides a naive implementation that chooses an actor based on
keyword matching. It can be extended to use LLMs similar to ``AutoselectService``
when an API key is available.
"""
from __future__ import annotations

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ActorSuggestService:
    def suggest(self, description: str, actors: List[Dict[str, Any]]) -> int | None:
        """Return the actor id that best matches *description*."""
        if not description or not actors:
            return None
        desc = description.lower()
        best_id = actors[0].get("id")
        best_score = 0
        for actor in actors:
            score = 0
            for field in ("name", "role"):
                val = str(actor.get(field, "")).lower()
                if val and val in desc:
                    score += 2
            for field in ("permissions", "goals"):
                items = actor.get(field) or []
                if isinstance(items, list):
                    score += sum(1 for it in items if str(it).lower() in desc)
            if score > best_score:
                best_score = score
                best_id = actor.get("id")
        logger.info("Suggested actor %s with score %s", best_id, best_score)
        return best_id
