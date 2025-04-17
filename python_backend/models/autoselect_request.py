"""
models/autoselect_request.py
────────────────────────────
Typed request‑model for **POST /api/autoselect**.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List


@dataclass(slots=True)
class AutoSelectRequest:
    """Validated payload for /api/autoselect."""
    instructions: str
    treePaths: List[str] = field(default_factory=list)

    # ────────────────────────────────────────────────────────────────────
    # Factories
    # ────────────────────────────────────────────────────────────────────
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AutoSelectRequest":
        """
        Validate and convert *data* → :class:`AutoSelectRequest`.

        Raises
        ------
        ValueError
            If the structure or types do not match the spec.
        """
        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object.")

        instructions = data.get("instructions")
        tree_paths   = data.get("treePaths")

        if not isinstance(instructions, str) or not instructions.strip():
            raise ValueError("'instructions' must be a non‑empty string.")
        if (not isinstance(tree_paths, list) or
                not all(isinstance(p, str) for p in tree_paths) or
                not tree_paths):
            raise ValueError("'treePaths' must be a **non‑empty** array of strings.")

        return cls(
            instructions=instructions.strip(),
            treePaths=[p.strip() for p in tree_paths],
        )
