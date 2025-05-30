"""
request_models.py – Pydantic schemas used by the Flask controllers
──────────────────────────────────────────────────────────────────
Every endpoint that receives a JSON body now validates the payload
through one of these models.  Validation errors are propagated back
to the caller in a uniform way from the controllers.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


# ───────────────────────── generic helpers ──────────────────────────
class _FlexibleModel(BaseModel):
    """Base model that **allows** additional / unknown fields."""
    class Config:
        extra = "allow"


# ───────────────────────── project / files ─────────────────────────
class ProjectFilesRequest(BaseModel):
    baseDir: str = Field(..., min_length=1)
    paths: List[str] = Field(default_factory=list)

    @validator("paths", each_item=True)
    def _validate_paths(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Each item in 'paths' must be a string.")
        return v


class CodemapExtractRequest(ProjectFilesRequest):
    """Identical shape – kept separate for semantics."""


# ────────────────────────── token count ────────────────────────────
class TokenCountRequest(BaseModel):
    text: str = Field(..., min_length=1)


# ──────────────────────────── todos ────────────────────────────────
class TodoCreateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    createdAt: Optional[str] = None  # ISO-8601 string or None


class TodoUpdateRequest(BaseModel):
    completed: bool


# ─────────────────────────── kanban ───────────────────────────────
class KanbanCreateRequest(_FlexibleModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: Optional[str] = None


class KanbanUpdateRequest(_FlexibleModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


# ───────────────────── selection-groups / others ───────────────────
class SelectionGroupsSaveRequest(BaseModel):
    groups: Dict[str, Any]


class ResolveFolderRequest(BaseModel):
    folderName: str = Field(..., min_length=1)


class GlobalExclusionsRequest(BaseModel):
    exclusions: List[str]


class LocalExclusionsRequest(BaseModel):
    localExclusions: List[str]


class SaveMetapromptRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    content: str
