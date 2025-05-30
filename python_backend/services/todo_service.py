# File: python_backend/services/todo_service.py
# NEW FILE
import os
import logging
import time
from typing import List, Dict, Any, Optional
from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository

logger = logging.getLogger(__name__)

@wrap_service_methods
class TodoService:
    """Service layer for managing TODO items."""

    def __init__(self, storage_repo: FileStorageRepository):
        self.storage_repo = storage_repo
        self.todo_filename = 'todos.json'
        self.codetoprompt_dir_name = '.codetoprompt'
        # Simple in-memory fallback (can be removed if file-based is always required)
        self._in_memory_db: Dict[int, Dict[str, Any]] = {
             1: {'id': 1, 'text': 'Sample global todo', 'completed': False, 'createdAt': time.time()}
        }
        self._next_id = 2

    def _get_todo_file_path(self, project_path: Optional[str]) -> Optional[str]:
        """Gets the path to the todo file, returns None if no project path."""
        if not project_path:
            return None
        if not os.path.isdir(project_path):
            # Or raise ValueError depending on desired behavior
            logger.warning(f"Project path '{project_path}' is not a valid directory.")
            return None
        return os.path.join(project_path, self.codetoprompt_dir_name, self.todo_filename)

    def _load_todos(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Loads todos either from file or in-memory fallback."""
        file_path = self._get_todo_file_path(project_path)
        if file_path:
            try:
                data = self.storage_repo.read_json(file_path, default=[])
                if not isinstance(data, list):
                    logger.warning(f"Todo file {file_path} is not a list. Returning empty.")
                    return []
                # Basic validation of structure could be added here
                return data
            except Exception as e:
                logger.error(f"Failed to load todos for {project_path}: {e}")
                return [] # Return empty on error
        else:
            # In-memory fallback
            return list(self._in_memory_db.values())

    def _save_todos(self, project_path: Optional[str], todos: List[Dict[str, Any]]):
        """Saves todos either to file or updates in-memory fallback."""
        file_path = self._get_todo_file_path(project_path)
        if file_path:
            try:
                self.storage_repo.write_json(file_path, todos)
            except IOError as e:
                logger.error(f"Failed to save todos for {project_path}: {e}")
                raise # Re-raise IOErrors
        else:
            # In-memory fallback update
            self._in_memory_db = {item['id']: item for item in todos}
            # Update next_id if needed
            if todos:
                max_id = max(item['id'] for item in todos)
                self._next_id = max_id + 1

    def list_todos(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Lists all todos for the given project path (or global if None)."""
        return self._load_todos(project_path)

    def add_todo(self, text: str, project_path: Optional[str], created_at: Optional[str] = None) -> Dict[str, Any]:
        """Adds a new todo."""
        if not text:
            raise ValueError("Todo text cannot be empty.")

        todos = self._load_todos(project_path)
        new_id = int(time.time() * 1000) # Simple timestamp-based ID

        # Ensure ID is unique if using timestamp
        while any(t['id'] == new_id for t in todos):
             new_id += 1 # Increment if collision (unlikely but possible)

        new_item = {
            'id': new_id,
            'text': text,
            'completed': False,
            'createdAt': created_at or time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        todos.append(new_item)
        self._save_todos(project_path, todos)
        return new_item

    def update_todo(self, todo_id: int, completed: bool, project_path: Optional[str]) -> Optional[Dict[str, Any]]:
        """Updates the completion status of a todo."""
        todos = self._load_todos(project_path)
        updated_item = None
        for item in todos:
            if item.get('id') == todo_id:
                item['completed'] = bool(completed)
                updated_item = item
                break

        if updated_item is None:
            return None # Not found

        self._save_todos(project_path, todos)
        return updated_item

    def delete_todo(self, todo_id: int, project_path: Optional[str]) -> bool:
        """Deletes a todo."""
        todos = self._load_todos(project_path)
        initial_length = len(todos)
        todos = [item for item in todos if item.get('id') != todo_id]

        if len(todos) == initial_length:
            return False # Not found

        self._save_todos(project_path, todos)
        return True