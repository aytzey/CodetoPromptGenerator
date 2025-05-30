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

from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository

# ──────────────────────────────────────────────
# Pydantic schema – guarantees runtime correctness
# ──────────────────────────────────────────────
StatusT   = Literal["todo", "in-progress", "done"]
PriorityT = Literal["low", "medium", "high"]


@wrap_service_methods
class KanbanItemModel(BaseModel):
    id:          int
    title:       str  = Field(min_length=1, max_length=256)
    details:     Optional[str] = None
    status:      StatusT    = "todo"
    priority:    PriorityT  = "medium"
    dueDate:     Optional[str] = None          # ISO-8601
    createdAt:   str
    userStoryIds: List[int] = Field(default_factory=list) # Added for relations


    # empty strings → None (prevents validation error on “clear”)
    @validator("details", "dueDate", pre=True, always=True)
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

@wrap_service_methods
class KanbanService:
    def __init__(self, storage_repo: FileStorageRepository):
        self.storage = storage_repo
        self._file_name = "kanban.json"
        self._relations_file = "user_story_tasks.json"

    def _get_project_dir(self, project_path: Optional[str]) -> str:
        """Get the .codetoprompt directory for a project"""
        if not project_path:
            return os.path.expanduser("~/.codetoprompt")
        # Ensure the .codetoprompt directory exists inside the project path
        project_codetoprompt_dir = os.path.join(project_path, ".codetoprompt")
        try:
            os.makedirs(project_codetoprompt_dir, exist_ok=True)
        except OSError as e:
            raise IOError(f"Failed to create directory {project_codetoprompt_dir}: {e}") from e
        return project_codetoprompt_dir

    def _load_items(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Load kanban items from storage"""
        project_dir = self._get_project_dir(project_path)
        try:
            data = self.storage.read_json(os.path.join(project_dir, self._file_name), default={"items": []})
            return data.get("items", []) if isinstance(data, dict) else []
        except (IOError, json.JSONDecodeError):
            return []

    def _save_items(self, items: List[Dict[str, Any]], project_path: Optional[str]) -> None:
        """Save kanban items to storage"""
        project_dir = self._get_project_dir(project_path)
        self.storage.write_json(os.path.join(project_dir, self._file_name), {"items": items})
        
    def _load_relations(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Load user story-task relations from file"""
        project_dir = self._get_project_dir(project_path)
        try:
            data = self.storage.read_json(os.path.join(project_dir, self._relations_file), default={"relations": []})
            return data.get("relations", []) if isinstance(data, dict) else []
        except (IOError, json.JSONDecodeError):
            return []

    def list_items(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Get all kanban items with their associated user story IDs"""
        items = self._load_items(project_path)
        relations = self._load_relations(project_path)
        
        # Add userStoryIds to each task
        for item in items:
            item["userStoryIds"] = [
                r["userStoryId"] for r in relations 
                if r["taskId"] == item["id"]
            ]
            
        return items

    def add_item(self, item_data: Dict[str, Any], project_path: Optional[str]) -> Dict[str, Any]:
        """Create a new kanban item"""
        items = self._load_items(project_path)

        # Validate required fields
        if not item_data.get("title"):
            raise ValueError("Title is required")

        # Generate new ID
        new_id = max((item["id"] for item in items), default=0) + 1

        # Create item with defaults
        new_item = {
            "id": new_id,
            "title": item_data["title"],
            "details": item_data.get("details"),
            "status": item_data.get("status", "todo"),
            "priority": item_data.get("priority", "medium"),
            "dueDate": item_data.get("dueDate"),
            "createdAt": datetime.utcnow().isoformat() + "Z"
        }

        items.append(new_item)
        self._save_items(items, project_path)
        
        # Include empty userStoryIds for consistency
        new_item["userStoryIds"] = []
        
        return new_item

    def update_item(self, item_id: int, updates: Dict[str, Any], project_path: Optional[str]) -> Optional[Dict[str, Any]]:
        """Update a kanban item"""
        items = self._load_items(project_path)
        item_idx = next((i for i, item in enumerate(items) if item["id"] == item_id), None)

        if item_idx is None:
            return None

        # Update fields (except id and createdAt)
        item = items[item_idx]
        for key, value in updates.items():
            if key not in ["id", "createdAt", "userStoryIds"]:
                item[key] = value

        self._save_items(items, project_path)
        
        # Return updated item with userStoryIds
        relations = self._load_relations(project_path)
        item["userStoryIds"] = [
            r["userStoryId"] for r in relations 
            if r["taskId"] == item["id"]
        ]
        
        return item

    def delete_item(self, item_id: int, project_path: Optional[str]) -> bool:
        """Delete a kanban item and its relations"""
        items = self._load_items(project_path)
        original_count = len(items)

        items = [item for item in items if item["id"] != item_id]

        if len(items) < original_count:
            self._save_items(items, project_path)
            
            # Also remove all relations for this task
            project_dir = self._get_project_dir(project_path)
            relations = self._load_relations(project_path)
            relations = [r for r in relations if r["taskId"] != item_id]
            self.storage.write_json(os.path.join(project_dir, self._relations_file), {"relations": relations})
            
            return True

        return False