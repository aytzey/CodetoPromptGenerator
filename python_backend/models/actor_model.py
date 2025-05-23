# python_backend/models/actor_model.py
from typing import List, Optional
from pydantic import BaseModel, Field, ValidationError, validator

class ActorModel(BaseModel):
    """
    Pydantic model for an Actor in the project.
    Actors represent distinct roles, users, or external systems interacting with the product.
    """
    id: int = Field(..., description="Unique identifier for the actor")
    name: str = Field(..., min_length=1, max_length=100, description="Name of the actor (e.g., 'Developer', 'LLM Provider')")
    role: str = Field(..., min_length=1, description="Description of the actor's role or primary activities")
    permissions: List[str] = Field(default_factory=list, description="List of key actions or access rights within the system")
    goals: List[str] = Field(default_factory=list, description="List of primary goals or problems the actor solves using the system")

    class Config:
        # Allows Pydantic to work with non-dict input (e.g., from ORM models if applicable)
        from_attributes = True

    @validator('permissions', 'goals', pre=True, always=True)
    def ensure_list_of_strings(cls, v):
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError('must be a list')
        if not all(isinstance(item, str) for item in v):
            raise ValueError('all items must be strings')
        return v