from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Any, Optional

@dataclass(slots=True)
class ActorGenerateRequest:
    """Validated payload for /api/actors/generate."""
    treePaths: List[str] = field(default_factory=list)
    baseDir: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ActorGenerateRequest":
        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object.")
        tree_paths = data.get("treePaths")
        base_dir = data.get("baseDir") or data.get("projectPath")
        if (
            not isinstance(tree_paths, list)
            or not all(isinstance(p, str) for p in tree_paths)
            or not tree_paths
        ):
            raise ValueError("'treePaths' must be a non-empty array of strings.")
        if base_dir is not None and not isinstance(base_dir, str):
            raise ValueError("'baseDir' must be a string if provided.")
        return cls(treePaths=[p.strip() for p in tree_paths], baseDir=base_dir)
