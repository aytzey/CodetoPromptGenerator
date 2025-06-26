#  models/autoselect_request.py
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, validator


class AutoSelectRequest(BaseModel):
    """Payload accepted by /api/autoselect endpoints."""

    baseDir: str = Field(..., description="Absolute path of project root")
    treePaths: List[str] = Field(..., description="Flat list of *relative* paths")
    instructions: str = Field(..., min_length=3, description="User's task prompt")
    languages: Optional[List[str]] = Field(
        default=None,
        description="Optional language preferences inferred by client (‘py’, ‘cpp’, …)",
    )

    @validator("baseDir", "instructions")
    def _not_empty(cls, v: str) -> str:  # noqa: N805
        if not v.strip():
            raise ValueError("empty value not allowed")
        return v
