#!/usr/bin/env python3
"""
IPC Handler for Python Backend
Handles communication between Electron frontend and Python backend via stdin/stdout
"""

import sys
import json
import traceback
import importlib
import asyncio
from typing import Dict, Any, Optional, Callable
from pathlib import Path

# Add python_backend to path if needed
sys.path.insert(0, str(Path(__file__).parent))

# Import services
from services.project_service import ProjectService
from services.autoselect_service import AutoselectService
from services.exclusion_service import ExclusionService
from services.prompt_service import PromptService
from services.kanban_service import KanbanService
from repositories.file_storage import FileStorageRepository
from services.todo_service import TodoService
from services.actor_service import ActorService
from services.user_story_service import UserStoryService
from services.embeddings_service import EmbeddingsService
from services.metaprompt_service import MetaPromptService
from services.service_exceptions import ServiceError, InvalidInputError

class IPCHandler:
    """Handles IPC communication via stdin/stdout"""
    
    def __init__(self):
        self.service_map = self._build_service_map()
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
    
    def _build_service_map(self) -> Dict[str, Callable]:
        """Build a mapping of endpoint names to service methods"""
        # Create shared dependencies
        storage_repo = FileStorageRepository()
        exclusion_service = ExclusionService(storage_repo)
        
        return {
            # Project endpoints
            "project/get_tree": lambda p: (
                {} if not p.get("root_dir") else 
                ProjectService(storage_repo, exclusion_service).get_project_tree(p.get("root_dir"))
            ),
            "project/get_files": lambda p: ProjectService(storage_repo, exclusion_service).get_files_content(
                p.get("root_dir"), p.get("files", [])
            ),
            # Commented out - methods don't exist in ProjectService
            # "project/calculate_tokens": lambda p: ProjectService.calculate_tree_tokens(
            #     p.get("root_dir"), p.get("files", [])
            # ),
            # "project/update_item": lambda p: ProjectService.update_item(
            #     p.get("root_dir"), p.get("path"), p.get("updates", {})
            # ),
            # "project/search": lambda p: ProjectService.search_files(
            #     p.get("root_dir"), p.get("query", "")
            # ),
            
            # AutoSelect endpoints
            "autoselect/process": lambda p: self.loop.run_until_complete(
                AutoselectService().auto_select_files(
                    p.get("prompt"), p.get("root_dir"), p.get("settings", {})
                )
            ),
            "autoselect/clarify": lambda p: self.loop.run_until_complete(
                AutoselectService().clarify_selection(
                    p.get("prompt"), p.get("root_dir"), 
                    p.get("current_files", []), p.get("clarification")
                )
            ),
            
            # Exclusion endpoints
            "exclusion/list": lambda p: (
                exclusion_service.get_global_exclusions() if not p.get("root_dir") 
                else exclusion_service.get_local_exclusions(p.get("root_dir"))
            ),
            "exclusion/save": lambda p: (
                exclusion_service.update_global_exclusions(p.get("exclusions", [])) if not p.get("root_dir")
                else exclusion_service.update_local_exclusions(p.get("root_dir"), p.get("exclusions", []))
            ),
            
            # Prompt endpoints
            "prompt/refine": lambda p: self.loop.run_until_complete(
                PromptService().refine_prompt(
                    p.get("raw_prompt"), p.get("context", {})
                )
            ),
            # Commented out - method doesn't exist in PromptService
            # "prompt/generate": lambda p: PromptService.generate_content_prompt(
            #     p.get("root_dir"), p.get("files", []), 
            #     p.get("user_prompt", ""), p.get("include_line_numbers", False),
            #     p.get("line_number_format", ""), p.get("file_reference_format", ""),
            #     p.get("ai_provider", "anthropic"), p.get("format", "markdown")
            # ),
            
            # MetaPrompt endpoints
            "metaprompt/list": lambda p: MetaPromptService(storage_repo).list_metaprompts(),
            "metaprompt/load": lambda p: MetaPromptService(storage_repo).load_metaprompt(
                p.get("filename", "")
            ),
            "metaprompt/save": lambda p: MetaPromptService(storage_repo).save_metaprompt(
                p.get("filename", ""), p.get("content", "")
            ),
            "metaprompt/delete": lambda p: MetaPromptService(storage_repo).delete_metaprompt(
                p.get("filename", "")
            ),
            
            # Kanban endpoints
            "kanban/list": lambda p: KanbanService(storage_repo).list_items(
                p.get("project_path")
            ),
            "kanban/create": lambda p: KanbanService(storage_repo).add_item(
                p.get("item_data", {}), p.get("project_path")
            ),
            "kanban/update": lambda p: KanbanService(storage_repo).update_item(
                p.get("item_id"), p.get("updates", {}), p.get("project_path")
            ),
            "kanban/delete": lambda p: KanbanService(storage_repo).delete_item(
                p.get("item_id"), p.get("project_path")
            ),
            
            # Todo endpoints
            "todo/list": lambda p: (
                [] if not p.get("root_dir") else
                TodoService(storage_repo).list_todos(p.get("root_dir"))
            ),
            "todo/create": lambda p: TodoService(storage_repo).add_todo(
                p.get("root_dir"), p.get("todo", {})
            ),
            "todo/update": lambda p: TodoService(storage_repo).update_todo(
                p.get("root_dir"), p.get("todo_id"), p.get("updates", {})
            ),
            "todo/delete": lambda p: TodoService(storage_repo).delete_todo(
                p.get("root_dir"), p.get("todo_id")
            ),
            # Commented out - method doesn't exist in TodoService
            # "todo/toggle": lambda p: TodoService.toggle_todo(
            #     p.get("root_dir"), p.get("todo_id")
            # ),
            
            # Actor endpoints
            "actor/list": lambda p: [
                actor.model_dump() for actor in ActorService(storage_repo).list_actors(
                    p.get("root_dir") or None  # project_path is optional
                )
            ],
            "actor/create": lambda p: ActorService(storage_repo).create_actor(
                p.get("actor", {}), p.get("root_dir") or None  # actor_data first, then optional project_path
            ).model_dump(),
            "actor/update": lambda p: ActorService(storage_repo).update_actor(
                p.get("actor_id"), p.get("updates", {}), p.get("root_dir") or None  # id, updates, then optional project_path
            ).model_dump(),
            "actor/delete": lambda p: ActorService(storage_repo).delete_actor(
                p.get("actor_id"), p.get("root_dir") or None  # id, then optional project_path
            ),
            
            # User Story endpoints
            "userstory/list": lambda p: UserStoryService(storage_repo).list_stories(p.get("root_dir")),
            "userstory/create": lambda p: UserStoryService(storage_repo).create_story(
                p.get("root_dir"), p.get("story", {})
            ),
            "userstory/update": lambda p: UserStoryService(storage_repo).update_story(
                p.get("root_dir"), p.get("story_id"), p.get("updates", {})
            ),
            "userstory/delete": lambda p: UserStoryService(storage_repo).delete_story(
                p.get("root_dir"), p.get("story_id")
            ),
            
            # Embeddings endpoints
            "embeddings/generate": lambda p: self.loop.run_until_complete(
                EmbeddingsService(p.get("root_dir")).generate_embeddings(
                    p.get("root_dir"), p.get("files", [])
                )
            ),
            "embeddings/query": lambda p: self.loop.run_until_complete(
                EmbeddingsService(p.get("root_dir")).query_similar_files(
                    p.get("root_dir"), p.get("query"), p.get("top_k", 10)
                )
            ),
            
            # File upload endpoints - TODO: Implement FileUploadService
            # "upload/process": lambda p: FileUploadService.process_file_upload(
            #     p.get("file_path"), p.get("original_name")
            # ),
            
            # Token endpoints - TODO: Implement TokenService
            # "token/count": lambda p: TokenService.count_tokens(
            #     p.get("text", ""), p.get("model", "gpt-3.5-turbo")
            # ),
            
            # Export endpoints - TODO: Implement ExportService
            # "export/project": lambda p: ExportService.export_project(
            #     p.get("root_dir"), p.get("export_format", "markdown"),
            #     p.get("include_files", []), p.get("options", {})
            # ),
        }
    
    def _send_response(self, request_id: str, result: Any = None, error: str = None):
        """Send a response back via stdout"""
        response = {
            "id": request_id,
            "success": error is None,
        }
        
        if error is not None:
            response["error"] = error
        else:
            response["result"] = result
        
        # Write response as a single line
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()
    
    def _handle_request(self, message: Dict[str, Any]):
        """Handle a single request"""
        request_id = message.get("id")
        endpoint = message.get("endpoint")
        payload = message.get("payload", {})
        
        if not request_id:
            # Can't send proper response without ID
            sys.stderr.write("Error: Request missing 'id' field\n")
            sys.stderr.flush()
            return
        
        if not endpoint:
            self._send_response(request_id, error="Missing 'endpoint' field")
            return
        
        # Find and execute the service method
        handler = self.service_map.get(endpoint)
        if not handler:
            self._send_response(request_id, error=f"Unknown endpoint: {endpoint}")
            return
        
        try:
            result = handler(payload)
            self._send_response(request_id, result=result)
        except InvalidInputError as e:
            self._send_response(request_id, error=f"Validation error: {str(e)}")
        except ServiceError as e:
            self._send_response(request_id, error=f"Service error: {str(e)}")
        except Exception as e:
            # Log full traceback to stderr for debugging
            sys.stderr.write(f"Error handling request {request_id}:\n")
            sys.stderr.write(traceback.format_exc())
            sys.stderr.flush()
            self._send_response(request_id, error=f"Internal error: {str(e)}")
    
    def run(self):
        """Main loop - read requests from stdin and send responses to stdout"""
        sys.stderr.write("IPC Handler started\n")
        sys.stderr.flush()
        
        try:
            for line in sys.stdin:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    message = json.loads(line)
                    self._handle_request(message)
                except json.JSONDecodeError as e:
                    sys.stderr.write(f"Invalid JSON: {e}\n")
                    sys.stderr.flush()
        except KeyboardInterrupt:
            sys.stderr.write("IPC Handler shutting down\n")
            sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"Fatal error: {e}\n")
            sys.stderr.write(traceback.format_exc())
            sys.stderr.flush()
        finally:
            self.loop.close()


if __name__ == "__main__":
    handler = IPCHandler()
    handler.run()