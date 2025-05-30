# python_backend/services/user_story_service.py
import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from services.service_exceptions import wrap_service_methods
from repositories.file_storage import FileStorageRepository


@wrap_service_methods
class UserStoryService:
    def __init__(self, storage_repo: FileStorageRepository):
        self.storage = storage_repo
        self._stories_file = "user_stories.json"
        self._relations_file = "user_story_tasks.json"
        
    def _get_project_dir(self, project_path: Optional[str]) -> str:
        """Get the .codetoprompt directory for a project"""
        if not project_path:
            return os.path.expanduser("~/.codetoprompt")
        
        project_codetoprompt_dir = os.path.join(project_path, ".codetoprompt")
        try:
            os.makedirs(project_codetoprompt_dir, exist_ok=True)
        except OSError as e:
            raise IOError(f"Failed to create directory {project_codetoprompt_dir}: {e}") from e
        return project_codetoprompt_dir
        
    def _load_stories(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Load user stories from file"""
        project_dir = self._get_project_dir(project_path)
        try:
            data = self.storage.read_json(os.path.join(project_dir, self._stories_file), default={"stories": []})
            return data.get("stories", []) if isinstance(data, dict) else []
        except (IOError, json.JSONDecodeError):
            return []
            
    def _save_stories(self, stories: List[Dict[str, Any]], project_path: Optional[str]) -> None:
        """Save user stories to file"""
        project_dir = self._get_project_dir(project_path)
        self.storage.write_json(os.path.join(project_dir, self._stories_file), {"stories": stories})
        
    def _load_relations(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Load user story-task relations from file"""
        project_dir = self._get_project_dir(project_path)
        try:
            data = self.storage.read_json(os.path.join(project_dir, self._relations_file), default={"relations": []})
            return data.get("relations", []) if isinstance(data, dict) else []
        except (IOError, json.JSONDecodeError):
            return []
            
    def _save_relations(self, relations: List[Dict[str, Any]], project_path: Optional[str]) -> None:
        """Save user story-task relations to file"""
        project_dir = self._get_project_dir(project_path)
        self.storage.write_json(os.path.join(project_dir, self._relations_file), {"relations": relations})
        
    def list_stories(self, project_path: Optional[str]) -> List[Dict[str, Any]]:
        """Get all user stories with their associated task IDs"""
        stories = self._load_stories(project_path)
        relations = self._load_relations(project_path)
        
        # Add taskIds to each story
        for story in stories:
            story["taskIds"] = [
                r["taskId"] for r in relations 
                if r["userStoryId"] == story["id"]
            ]
            
        return stories
        
    def get_story(self, story_id: int, project_path: Optional[str]) -> Optional[Dict[str, Any]]:
        """Get a specific user story by ID"""
        stories = self.list_stories(project_path)
        return next((s for s in stories if s["id"] == story_id), None)
        
    def create_story(self, story_data: Dict[str, Any], project_path: Optional[str]) -> Dict[str, Any]:
        """Create a new user story"""
        stories = self._load_stories(project_path)
        
        # Validate required fields
        if not story_data.get("title"):
            raise ValueError("Title is required")
            
        # Generate new ID
        new_id = max((s["id"] for s in stories), default=0) + 1
        
        # Create story object
        new_story = {
            "id": new_id,
            "title": story_data["title"],
            "actorId": story_data.get("actorId"),
            "description": story_data.get("description"),
            "acceptanceCriteria": story_data.get("acceptanceCriteria"),
            "priority": story_data.get("priority", "medium"),
            "points": story_data.get("points"),
            "status": story_data.get("status", "todo"),
            "createdAt": datetime.utcnow().isoformat() + "Z"
        }
        
        stories.append(new_story)
        self._save_stories(stories, project_path)
        
        # Handle initial task associations if provided
        if "taskIds" in story_data and story_data["taskIds"]:
            if not isinstance(story_data["taskIds"], list) or not all(isinstance(t, int) for t in story_data["taskIds"]):
                raise ValueError("'taskIds' must be a list of integers.")
            self.associate_tasks(new_id, story_data["taskIds"], project_path)
            new_story["taskIds"] = story_data["taskIds"]
        else:
            new_story["taskIds"] = []
            
        return new_story
        
    def update_story(self, story_id: int, updates: Dict[str, Any], project_path: Optional[str]) -> Optional[Dict[str, Any]]:
        """Update a user story"""
        stories = self._load_stories(project_path)
        story_index = next((i for i, s in enumerate(stories) if s["id"] == story_id), None)
        
        if story_index is None:
            return None
            
        # Update story fields (except ID and createdAt)
        story = stories[story_index]
        for key, value in updates.items():
            if key not in ["id", "createdAt", "taskIds"]:
                story[key] = value
                
        self._save_stories(stories, project_path)
        
        # Handle task associations separately if provided in updates
        if "taskIds" in updates:
            if not isinstance(updates["taskIds"], list) or not all(isinstance(t, int) for t in updates["taskIds"]):
                raise ValueError("'taskIds' must be a list of integers.")
            self.associate_tasks(story_id, updates["taskIds"], project_path)
            
        return self.get_story(story_id, project_path)
        
    def delete_story(self, story_id: int, project_path: Optional[str]) -> bool:
        """Delete a user story and its relations"""
        stories = self._load_stories(project_path)
        original_count = len(stories)
        
        # Remove the story
        stories = [s for s in stories if s["id"] != story_id]
        
        if len(stories) < original_count:
            self._save_stories(stories, project_path)
            
            # Remove all relations for this story
            relations = self._load_relations(project_path)
            relations = [r for r in relations if r["userStoryId"] != story_id]
            self._save_relations(relations, project_path)
            
            return True
            
        return False
        
    def associate_tasks(self, story_id: int, task_ids: List[int], project_path: Optional[str]) -> None:
        """Set the tasks associated with a user story (replaces existing associations)"""
        relations = self._load_relations(project_path)
        
        # Check if user story exists before associating tasks
        if not self.get_story(story_id, project_path):
            raise ValueError(f"User story with ID {story_id} not found.")

        # Remove existing relations for this story
        relations = [r for r in relations if r["userStoryId"] != story_id]
        
        # Add new relations
        for task_id in task_ids:
            relations.append({
                "userStoryId": story_id,
                "taskId": task_id,
                "createdAt": datetime.utcnow().isoformat() + "Z"
            })
            
        self._save_relations(relations, project_path)
        
    def add_task_to_story(self, story_id: int, task_id: int, project_path: Optional[str]) -> bool:
        """Add a single task to a user story"""
        relations = self._load_relations(project_path)
        
        # Check if user story exists
        if not self.get_story(story_id, project_path):
            raise ValueError(f"User story with ID {story_id} not found.")

        # Check if relation already exists
        existing = any(
            r["userStoryId"] == story_id and r["taskId"] == task_id 
            for r in relations
        )
        
        if not existing:
            relations.append({
                "userStoryId": story_id,
                "taskId": task_id,
                "createdAt": datetime.utcnow().isoformat() + "Z"
            })
            self._save_relations(relations, project_path)
            return True
            
        return False
        
    def remove_task_from_story(self, story_id: int, task_id: int, project_path: Optional[str]) -> bool:
        """Remove a task from a user story"""
        relations = self._load_relations(project_path)
        original_count = len(relations)
        
        # Check if user story exists
        if not self.get_story(story_id, project_path):
            raise ValueError(f"User story with ID {story_id} not found.")

        relations = [
            r for r in relations 
            if not (r["userStoryId"] == story_id and r["taskId"] == task_id)
        ]
        
        if len(relations) < original_count:
            self._save_relations(relations, project_path)
            return True
            
        return False
        
    def get_tasks_for_story(self, story_id: int, project_path: Optional[str]) -> List[int]:
        """Get all task IDs associated with a user story"""
        relations = self._load_relations(project_path)
        return [r["taskId"] for r in relations if r["userStoryId"] == story_id]
        
    def get_stories_for_task(self, task_id: int, project_path: Optional[str]) -> List[int]:
        """Get all user story IDs associated with a task"""
        relations = self._load_relations(project_path)
        return [r["userStoryId"] for r in relations if r["taskId"] == task_id]