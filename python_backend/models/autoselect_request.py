"""
models/autoselect_request.py
────────────────────────────
Typed request‑model for **POST /api/autoselect**.

vNext (2025‑04‑22)
──────────────────
*   Added **optional** `baseDir` so the AutoselectService can read snippets
    and build a graph‑like structure rather than just a flat name list.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional


@dataclass(slots=True)
class AutoSelectRequest:
    """Validated payload for /api/autoselect."""
    instructions: str
    treePaths: List[str] = field(default_factory=list)
    baseDir: Optional[str] = None               # ← NEW (optional)

    # ────────────────────────────────────────────────────────────────────
    # Factories
    # ────────────────────────────────────────────────────────────────────
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AutoSelectRequest":
        """
        Validate and convert *data* → :class:`AutoSelectRequest`.

        Required fields
        ---------------
        • instructions – non‑empty str  
        • treePaths    – non‑empty list[str]

        Optional
        --------
        • baseDir – project root (absolute); enables graph‑style snippets.
        """
        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object.")

        instructions = data.get("instructions")
        tree_paths   = data.get("treePaths")
        base_dir     = data.get("baseDir")          # may be None

        if not isinstance(instructions, str) or not instructions.strip():
            raise ValueError("'instructions' must be a non‑empty string.")

        if (not isinstance(tree_paths, list)
                or not all(isinstance(p, str) for p in tree_paths)
                or not tree_paths):
            raise ValueError("'treePaths' must be a **non‑empty** array of strings.")

        if base_dir is not None and not isinstance(base_dir, str):
            raise ValueError("'baseDir' must be a string if provided.")

        return cls(
            instructions=instructions.strip(),
            treePaths=[p.strip() for p in tree_paths],
            baseDir=(base_dir.strip() or None) if isinstance(base_dir, str) else None,
        )
