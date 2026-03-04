"""
Read and write per-project selection groups.

Stored at:
    <project_root>/.codetoprompt/selection_groups.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Any

from utils.path_utils import ensure_subdir

FILE_NAME = "selection_groups.json"
SelectionGroups = Dict[str, List[str]]


def _file_path(project_path: str) -> Path:
    project_dir = Path(project_path).expanduser().resolve()
    ct_prompt_dir = ensure_subdir(project_dir, ".codetoprompt")
    return ct_prompt_dir / FILE_NAME


def _normalize_groups(payload: Any, *, strict: bool) -> SelectionGroups:
    if not isinstance(payload, dict):
        if strict:
            raise ValueError("Selection groups payload must be an object.")
        return {}

    normalized: SelectionGroups = {}
    for raw_group_name, raw_paths in payload.items():
        if not isinstance(raw_group_name, str) or not raw_group_name.strip():
            if strict:
                raise ValueError("Each selection group name must be a non-empty string.")
            continue

        if not isinstance(raw_paths, list):
            if strict:
                raise ValueError(f"Selection group '{raw_group_name}' must be a list of paths.")
            continue

        cleaned_paths: List[str] = []
        seen: set[str] = set()
        for item in raw_paths:
            if not isinstance(item, str):
                if strict:
                    raise ValueError(
                        f"Selection group '{raw_group_name}' contains a non-string path."
                    )
                continue

            normalized_path = item.strip().replace("\\", "/")
            if not normalized_path or normalized_path in seen:
                continue
            seen.add(normalized_path)
            cleaned_paths.append(normalized_path)

        normalized[raw_group_name.strip()] = cleaned_paths

    return normalized


def load_groups(project_path: str) -> SelectionGroups:
    fp = _file_path(project_path)
    if not fp.exists():
        return {}

    try:
        with fp.open("r", encoding="utf-8") as fh:
            payload = json.load(fh)
        return _normalize_groups(payload, strict=False)
    except Exception:
        # Corrupt JSON should not break UI loading.
        return {}


def save_groups(project_path: str, groups: Any) -> None:
    fp = _file_path(project_path)
    normalized = _normalize_groups(groups, strict=True)
    try:
        with fp.open("w", encoding="utf-8") as fh:
            json.dump(normalized, fh, indent=2, ensure_ascii=False)
    except Exception as exc:
        raise RuntimeError(f"Could not write selection groups: {exc}") from exc
