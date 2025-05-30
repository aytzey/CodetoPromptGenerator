# python_backend/services/actor_service.py
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository
from models.actor_model import ActorModel # Import the Pydantic model
from pydantic import ValidationError

logger = logging.getLogger(__name__)
@wrap_service_methods
class ActorService:
    def __init__(self, storage_repo: FileStorageRepository):
        self.storage = storage_repo
        self._actors_file = "actors.json"
        self.codetoprompt_dir_name = ".codetoprompt"
        self._default_actors_data = [
            {
                "id": 1,
                "name": "Developer",
                "role": "Primary user who interacts with the application's UI to generate LLM prompts from code and manage project-related data.",
                "permissions": [
                    "Manage project path and file selection",
                    "Manage global and local file exclusions",
                    "Manage meta prompts and main instructions",
                    "Trigger AI-powered smart selection and prompt refinement",
                    "Manage Kanban tasks, Todo items, and User Stories",
                    "Manage selection groups of files",
                    "Copy generated prompt to clipboard",
                    "Configure OpenRouter API key"
                ],
                "goals": [
                    "Efficiently create context-rich LLM prompts from codebase",
                    "Organize development tasks and requirements within the tool",
                    "Leverage AI for improved prompt engineering workflow"
                ]
            },
            {
                "id": 2,
                "name": "LLM Provider",
                "role": "External AI service (e.g., OpenRouter) that provides language model inference capabilities for prompt refinement and smart file selection.",
                "permissions": [
                    "Receive text and code context for processing",
                    "Return refined prompt text",
                    "Return a list of suggested file paths"
                ],
                "goals": [
                    "Process natural language and code context using AI models",
                    "Support intelligent automation features within the tool"
                ]
            },
            {
                "id": 3,
                "name": "Local File System",
                "role": "The local storage system (disk) where project files reside and application data is persistently stored.",
                "permissions": [
                    "Read project directories and file contents",
                    "Write application configuration files (e.g., .codetoprompt/ files, ignoreDirs.txt)",
                    "Store and retrieve JSON data for tasks, stories, and selection groups"
                ],
                "goals": [
                    "Ensure persistence of user data and configurations",
                    "Provide access to the local codebase for prompt generation"
                ]
            }
        ]

    def _get_project_dir(self, project_path: Optional[str]) -> str:
        """
        Get the .codetoprompt directory for a project or the global one.
        Ensures the directory exists.
        """
        if not project_path:
            target_dir = os.path.expanduser(f"~/{self.codetoprompt_dir_name}")
        else:
            if not os.path.isdir(project_path):
                raise ValueError(f"Project path '{project_path}' is not a valid directory.")
            target_dir = os.path.join(project_path, self.codetoprompt_dir_name)
        
        try:
            os.makedirs(target_dir, exist_ok=True)
        except OSError as e:
            raise IOError(f"Failed to create directory {target_dir}: {e}") from e
        return target_dir

    def _get_actors_file_path(self, project_path: Optional[str]) -> str:
        """Constructs the full path to the actors JSON file."""
        project_dir = self._get_project_dir(project_path)
        return os.path.join(project_dir, self._actors_file)

    def _load_actors(self, project_path: Optional[str]) -> List[ActorModel]:
        """
        Loads actors from the project's JSON file.
        If the file doesn't exist, it initializes with default actors and saves them.
        """
        file_path = self._get_actors_file_path(project_path)
        data = self.storage.read_json(file_path, default={"actors": []})
        
        actors_raw = data.get("actors", []) if isinstance(data, dict) else []
        
        # If no actors are loaded and it's a new project or empty file, populate with defaults
        if not actors_raw:
            try:
                # Validate and convert default data to ActorModel instances
                actors = [ActorModel(**actor_data) for actor_data in self._default_actors_data]
                self._save_actors(actors, project_path) # Save defaults to disk
                logger.info(f"Initialized actors file with default actors at {file_path}")
                return actors
            except ValidationError as e:
                logger.error(f"Failed to validate default actor data: {e}")
                return []
            except IOError as e:
                logger.error(f"Failed to save default actors to {file_path}: {e}")
                return []
        
        # Validate and convert loaded data to ActorModel instances
        loaded_actors: List[ActorModel] = []
        for actor_data in actors_raw:
            try:
                loaded_actors.append(ActorModel(**actor_data))
            except ValidationError as e:
                logger.warning(f"Skipping invalid actor data in {file_path}: {actor_data}. Error: {e}")
            except TypeError as e: # Handle cases where data is not a dict
                logger.warning(f"Skipping malformed actor data in {file_path}: {actor_data}. Error: {e}")
        
        return loaded_actors

    def _save_actors(self, actors: List[ActorModel], project_path: Optional[str]) -> None:
        """Saves a list of ActorModel instances to the project's JSON file."""
        file_path = self._get_actors_file_path(project_path)
        # Convert Pydantic models back to dicts for JSON serialization
        # Pydantic v1.x uses ``dict()`` instead of ``model_dump()``.
        actors_data = [actor.dict() for actor in actors]
        self.storage.write_json(file_path, {"actors": actors_data})

    def list_actors(self, project_path: Optional[str]) -> List[ActorModel]:
        """Returns all actors for the given project path (or global defaults)."""
        return self._load_actors(project_path)

    def create_actor(self, actor_data: Dict[str, Any], project_path: Optional[str]) -> ActorModel:
        """
        Creates a new actor.
        Expects actor_data to be a dict suitable for ActorModel (without ID).
        """
        actors = self._load_actors(project_path)
        
        # Generate new ID
        new_id = max((a.id for a in actors), default=0) + 1
        
        # Add ID and validate with Pydantic model
        full_actor_data = {"id": new_id, **actor_data}
        try:
            new_actor = ActorModel(**full_actor_data)
        except ValidationError as e:
            raise ValueError(f"Invalid actor data: {e.errors()}") from e
        
        actors.append(new_actor)
        self._save_actors(actors, project_path)
        return new_actor

    def update_actor(self, actor_id: int, updates: Dict[str, Any], project_path: Optional[str]) -> Optional[ActorModel]:
        """
        Updates an existing actor by ID.
        Updates dict contains fields to change.
        """
        actors = self._load_actors(project_path)
        actor_index = next((i for i, a in enumerate(actors) if a.id == actor_id), None)
        
        if actor_index is None:
            return None
        
        # Apply updates and re-validate the entire model
        existing_actor = actors[actor_index].dict()  # Get dict representation
        updated_data = {**existing_actor, **updates}
        
        try:
            updated_actor = ActorModel(**updated_data)
        except ValidationError as e:
            raise ValueError(f"Invalid update data: {e.errors()}") from e
        
        actors[actor_index] = updated_actor
        self._save_actors(actors, project_path)
        return updated_actor

    def delete_actor(self, actor_id: int, project_path: Optional[str]) -> bool:
        """Deletes an actor by ID."""
        actors = self._load_actors(project_path)
        original_count = len(actors)
        
        actors = [a for a in actors if a.id != actor_id]
        
        if len(actors) < original_count:
            self._save_actors(actors, project_path)
            return True
            
        return False