# python_backend/services/selection_group_service.py
"""
Read / write Selection‑Group files.

The groups are stored per‑project under:
    <project_root>/.codetoprompt/selection_groups.json
"""

import json
from pathlib import Path
from typing import Dict, List

from utils.path_utils import ensure_subdir  

FILE_NAME = "selection_groups.json"


def _file_path(project_path: str) -> Path:
    project_dir = Path(project_path).expanduser().resolve()
    ct_prompt   = ensure_subdir(project_dir, ".codetoprompt")
    return ct_prompt / FILE_NAME


def load_groups(project_path: str) -> Dict[str, Dict[str, List[str]]]:
    fp = _file_path(project_path)
    if not fp.exists():
        return {}
    try:
        with fp.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        # corrupt file – start fresh
        return {}


def save_groups(project_path: str, groups: Dict[str, Dict[str, List[str]]]) -> None:
    fp = _file_path(project_path)
    try:
        with fp.open("w", encoding="utf-8") as fh:
            json.dump(groups, fh, indent=2, ensure_ascii=False)
    except Exception as exc:
        raise RuntimeError(f"Could not write selection groups: {exc}") from exc
