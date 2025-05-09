# python_backend/services/kanban_service.py
"""
Robust JSON-file Kanban persistence with basic validation.

• Per-project board lives in   <project>/.codetoprompt/kanban.json
• When *projectPath* is None we fall back to an in-memory board
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime
from typing import List, Dict, Any, Optional, Literal

from pydantic import BaseModel, Field, ValidationError, validator

from repositories.file_storage import FileStorageRepository

# ──────────────────────────────────────────────
# Pydantic schema – guarantees runtime correctness
# ──────────────────────────────────────────────
StatusT   = Literal["todo", "in-progress", "done"]
PriorityT = Literal["low", "medium", "high"]


class KanbanItemModel(BaseModel):
    id:        int
    title:     str  = Field(min_length=1, max_length=256)
    details:   str | None = None
    status:    StatusT    = "todo"
    priority:  PriorityT  = "medium"
    dueDate:   str | None = None          # ISO-8601
    createdAt: str

    # empty strings → None (prevents validation error on “clear”)
    @validator("dueDate", pre=True, always=True)
    def _blank_to_none(cls, v):           # noqa: N805
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @validator("dueDate")
    def _validate_due(cls, v):            # noqa: N805
        if v is None:
            return v
        try:
            datetime.fromisoformat(v)
        except ValueError as err:
            raise ValueError("dueDate must be ISO-8601") from err
        return v


# ──────────────────────────────────────────────
# Service layer
# ──────────────────────────────────────────────
class KanbanService:
    FILE_NAME  = "kanban.json"
    HIDDEN_DIR = ".codetoprompt"

    def __init__(self, storage_repo: FileStorageRepository):
        self.storage = storage_repo
        self._mem_db: Dict[int, Dict[str, Any]] = {}
        self._next_id = 1

    # ---------- helpers --------------------------------------------------
    def _file_path(self, project: Optional[str]) -> Optional[str]:
        if not project:
            return None
        hidden = os.path.join(project, self.HIDDEN_DIR)
        os.makedirs(hidden, exist_ok=True)
        return os.path.join(hidden, self.FILE_NAME)

    def _load(self, project: Optional[str]) -> List[Dict[str, Any]]:
        path = self._file_path(project)
        if not path:
            return list(self._mem_db.values())

        if not os.path.exists(path):
            return []

        try:
            data = self.storage.read_json(path, default=[])
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def _save(self, project: Optional[str], items: List[Dict[str, Any]]) -> None:
        path = self._file_path(project)
        if not path:
            self._mem_db = {it["id"]: it for it in items}
            return
        self.storage.write_json(path, items)

    @staticmethod
    def _serialise(model: KanbanItemModel) -> Dict[str, Any]:
        """
        Convert *model* → dict, **excluding keys whose value is None**.
        Prevents the FE Zod schema from receiving `null`.
        """
        return model.dict(exclude_none=True)

    # ---------- public API -----------------------------------------------
    def list_items(self, project: Optional[str]) -> List[Dict[str, Any]]:
        return self._load(project)

    def add_item(self, payload: Dict[str, Any], project: Optional[str]) -> Dict[str, Any]:
        now_iso = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        new_id  = int(time.time() * 1000)

        # sanitise blank strings in incoming payload
        payload = {k: (v if not (isinstance(v, str) and not v.strip()) else None)
                   for k, v in payload.items()}

        item_data = {
            "id":        new_id,
            "createdAt": now_iso,
            **payload,
        }

        try:
            item = self._serialise(KanbanItemModel(**item_data))
        except ValidationError as exc:
            raise ValueError(str(exc)) from exc

        items = self._load(project)
        items.append(item)
        self._save(project, items)
        return item

    def update_item(
        self,
        item_id: int,
        patch: Dict[str, Any],
        project: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        # sanitise blank strings from patch first
        patch = {k: (v if not (isinstance(v, str) and not v.strip()) else None)
                 for k, v in patch.items()}

        items = self._load(project)

        for idx, it in enumerate(items):
            if it["id"] == item_id:
                updated_raw = {**it, **patch}
                try:
                    updated = self._serialise(KanbanItemModel(**updated_raw))
                except ValidationError as exc:
                    raise ValueError(str(exc)) from exc
                items[idx] = updated
                self._save(project, items)
                return updated
        return None

    def delete_item(self, item_id: int, project: Optional[str]) -> bool:
        items = self._load(project)
        new_items = [it for it in items if it["id"] != item_id]
        if len(new_items) == len(items):
            return False                          # not found
        self._save(project, new_items)
        return True
