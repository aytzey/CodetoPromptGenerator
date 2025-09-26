The `TypeError: Failed to fetch` error occurring when navigating to the tasks screen strongly indicates that the frontend is attempting to make an API call to an endpoint that either does not exist on the backend or is not reachable.

Upon reviewing the provided code and project structure, the issue is identified:
1.  **Frontend expects `/api/user-stories`**: The `services/userStoryServiceHooks.ts` file attempts to fetch data from `/api/user-stories`.
2.  **Missing Backend Controller**: There is no corresponding Flask controller (`python_backend/controllers/user_story_controller.py`) defined to handle requests to the `/api/user-stories` endpoint. While `python_backend/services/user_story_service.py` exists, its functionality is not exposed via an API route.

To resolve this, a new Flask controller for user stories needs to be created. This controller will define the necessary API routes (GET, POST, PUT, DELETE) for managing user stories and their task associations, and will interact with the existing `UserStoryService`. The `python_backend/controllers/__init__.py` will automatically discover and register this new blueprint.

I will also update the `docs/api_ref.md` to include the new user story endpoints for completeness.

---

**Changes Made:**

1.  **`python_backend/controllers/user_story_controller.py` (New File):**
    *   Created a new Flask blueprint (`user_story_bp`).
    *   Implemented routes for listing, creating, retrieving, updating, and deleting user stories.
    *   Implemented routes for associating, adding, and removing tasks from user stories.
    *   All routes interact with the `UserStoryService` to perform business logic and data persistence.
    *   Error handling and response formatting are consistent with other controllers, using `success_response` and `error_response`.

2.  **`docs/api_ref.md` (Modified):**
    *   Added a new section (Section 9) detailing the User Story Management API endpoints.

---

**Full `python_backend/controllers/user_story_controller.py`:**

```python
# python_backend/controllers/user_story_controller.py
from flask import Blueprint, request
from services.user_story_service import UserStoryService
from repositories.file_storage import FileStorageRepository
from utils.response_utils import success_response, error_response
import logging

logger = logging.getLogger(__name__)

user_story_bp = Blueprint("user_story_bp", __name__)

# Dependencies
storage_repo = FileStorageRepository()
user_story_service = UserStoryService(storage_repo)

# Helper to get projectPath
def _get_project_path():
    project_path = request.args.get("projectPath")
    # UserStoryService handles None project_path by falling back to ~/.codetoprompt
    return project_path

# ───────────────────────────────────────────────────────────────────
# GET /api/user-stories?projectPath=…   → list all stories
# POST /api/user-stories?projectPath=…  → create new story
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories", methods=["GET", "POST"])
def user_stories_collection():
    project_path = _get_project_path()

    if request.method == "GET":
        try:
            stories = user_story_service.list_stories(project_path)
            return success_response(data=stories)
        except Exception as e:
            logger.exception(f"Error listing user stories for project: {project_path}")
            return error_response(str(e), "Failed to list user stories", 500)

    # ---------- POST (create) ----------
    payload = request.get_json(silent=True) or {}
    try:
        new_story = user_story_service.create_story(payload, project_path)
        return success_response(data=new_story, status_code=201)
    except ValueError as e:
        return error_response(str(e), status_code=400)
    except Exception as e:
        logger.exception(f"Error creating user story for project: {project_path}")
        return error_response(str(e), "Failed to create user story", 500)

# ───────────────────────────────────────────────────────────────────
# GET /api/user-stories/<id>?projectPath=…   → get a single story
# PUT /api/user-stories/<id>?projectPath=…   → update a story
# DELETE /api/user-stories/<id>?projectPath=…→ delete a story
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories/<int:story_id>", methods=["GET", "PUT", "DELETE"])
def user_story_item(story_id: int):
    project_path = _get_project_path()

    if request.method == "GET":
        try:
            story = user_story_service.get_story(story_id, project_path)
            if story is None:
                return error_response("User story not found", status_code=404)
            return success_response(data=story)
        except Exception as e:
            logger.exception(f"Error getting user story {story_id} for project: {project_path}")
            return error_response(str(e), "Failed to retrieve user story", 500)

    elif request.method == "PUT":
        patch = request.get_json(silent=True) or {}
        try:
            updated_story = user_story_service.update_story(story_id, patch, project_path)
            if updated_story is None:
                return error_response("User story not found", status_code=404)
            return success_response(data=updated_story)
        except ValueError as e:
            return error_response(str(e), status_code=400)
        except Exception as e:
            logger.exception(f"Error updating user story {story_id} for project: {project_path}")
            return error_response(str(e), "Failed to update user story", 500)

    # ---------- DELETE ----------
    elif request.method == "DELETE":
        try:
            deleted = user_story_service.delete_story(story_id, project_path)
            if not deleted:
                return error_response("User story not found", status_code=404)
            return "", 204 # 204 No Content
        except Exception as e:
            logger.exception(f"Error deleting user story {story_id} for project: {project_path}")
            return error_response(str(e), "Failed to delete user story", 500)

# ───────────────────────────────────────────────────────────────────
# PUT /api/user-stories/<id>/tasks?projectPath=…   → associate/update tasks
# POST /api/user-stories/<id>/tasks?projectPath=…  → add a single task
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories/<int:story_id>/tasks", methods=["PUT", "POST"])
def user_story_tasks_collection(story_id: int):
    project_path = _get_project_path()
    payload = request.get_json(silent=True) or {}

    if request.method == "PUT":
        task_ids = payload.get("taskIds")
        if not isinstance(task_ids, list) or not all(isinstance(t, int) for t in task_ids):
            return error_response("'taskIds' must be an array of integers.", status_code=400)
        try:
            user_story_service.associate_tasks(story_id, task_ids, project_path)
            return success_response(message="Tasks associated successfully.")
        except Exception as e:
            logger.exception(f"Error associating tasks for story {story_id} in project: {project_path}")
            return error_response(str(e), "Failed to associate tasks", 500)

    elif request.method == "POST":
        task_id = payload.get("taskId")
        if not isinstance(task_id, int):
            return error_response("'taskId' must be an integer.", status_code=400)
        try:
            added = user_story_service.add_task_to_story(story_id, task_id, project_path)
            if not added:
                return error_response("Task already associated or story not found.", status_code=409) # 409 Conflict
            return success_response(message="Task added to story.", status_code=201)
        except Exception as e:
            logger.exception(f"Error adding task {task_id} to story {story_id} in project: {project_path}")
            return error_response(str(e), "Failed to add task to story", 500)

# ───────────────────────────────────────────────────────────────────
# DELETE /api/user-stories/<id>/tasks/<taskId>?projectPath=… → remove a single task
# ───────────────────────────────────────────────────────────────────
@user_story_bp.route("/api/user-stories/<int:story_id>/tasks/<int:task_id>", methods=["DELETE"])
def user_story_task_item(story_id: int, task_id: int):
    project_path = _get_project_path()

    try:
        removed = user_story_service.remove_task_from_story(story_id, task_id, project_path)
        if not removed:
            return error_response("Task association not found", status_code=404)
        return "", 204 # 204 No Content
    except Exception as e:
        logger.exception(f"Error removing task {task_id} from story {story_id} in project: {project_path}")
        return error_response(str(e), "Failed to remove task from story", 500)

```

---

**Full `docs/api_ref.md`:**

```md
# Python Backend – REST API Reference  (2025‑04‑17)

> **Base URL (dev)** `http://127.0.0.1:5000`

All responses follow the envelope  
`{ "success": <bool>, "data?": <any>, "message?|error?": <string> }`.

---

## 1 · Service & Diagnostics
| Method | Path | Purpose |
| ------ | ---- | --------|
| GET    | `/health` | Quick liveness probe |

---

## 2 · Todo Management
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/api/todos?projectPath=<dir>` | List todos (global if omitted) |
| POST   | idem | Add new todo. Body → `{ "text": "…", "createdAt?": "ISO8601" }` |
| PUT    | `/api/todos/{id}?projectPath=<dir>` | Toggle completion. Body → `{ "completed": true }` |
| DELETE | `/api/todos/{id}?projectPath=<dir>` | Remove todo |

---

## 3 · Exclusions
### 3.1 Global (`ignoreDirs.txt`)
| Method | Path | Result |
| ------ | ---- | ------ |
| GET  | `/api/exclusions` | → `string[]` |
| POST | `/api/exclusions` | Body → `{ "exclusions": ["node_modules", "dist"] }` |

### 3.2 Local (per project)
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET  | `/api/localExclusions?projectPath=<dir>` | project‑specific ignore list |
| POST | idem | Body → `{ "localExclusions": ["*.log"] }` |

---

## 4 · Navigation & Files
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET  | `/api/drives` | Top‑level drives / mount points *(preferred)* |
| GET  | `/api/select_drives` | **Legacy** alias kept for FE backward‑compat |
| GET  | `/api/browse_folders?path=<dir>` | Immediate sub‑folders of *path* |
| GET  | `/api/projects/tree?rootDir=<dir>` | Recursive tree (honours global ignores) |
| POST | `/api/projects/files` | Body → `{ "baseDir": "<dir>", "paths": ["rel/a.ts", …] }` → content + token counts |
| POST | `/api/resolveFolder` | Body → `{ "folderName": "my‑proj" }` → absolute path |

---

## 5 · Meta Prompts
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/api/metaprompts?action=list&dir=<opt>` | List prompt files |
| GET    | `/api/metaprompts?action=load&file=<name>&dir=<opt>` | Load one file |
| POST   | `/api/metaprompts?dir=<opt>` | Save/update prompt |

---

## 6 · Utility
| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST   | `/api/tokenCount` | `{ text }` → tokens |

---

## 7 · Selection Groups
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET  | `/api/selectionGroups?projectPath=<dir>` | Load all stored groups for project |
| POST | `/api/selectionGroups?projectPath=<dir>` | Save groups. Body → `{ "groups": { "<name>": { "files": [] } } }` |

---

## 8 · Codemap Extraction  🆕
| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/codemap/extract` | Extract class/function maps. Body → `{ "baseDir": "<dir>", "paths": ["rel/foo.py", …] }` |

<details>
<summary>Response (200 OK)</summary>

```jsonc
{
  "success": true,
  "data": {
    "src/main.py": {
      "classes": ["MyApp"],
      "functions": ["run", "helper"],
      "references": ["Path", "Dict"]
    },
    "lib/utils.ts": {
      "classes": ["StringUtil"],
      "functions": ["slugify"],
      "references": []
    }
  }
}
```

## 9 · User Story Management 🆕
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/api/user-stories?projectPath=<dir>` | List all user stories for a project (or global if omitted) |
| POST   | `/api/user-stories?projectPath=<dir>` | Create a new user story. Body → `{ "title": "...", "description?": "...", "priority?": "medium", "points?": 5, "status?": "todo", "acceptanceCriteria?": "..." }` |
| GET    | `/api/user-stories/{id}?projectPath=<dir>` | Get a specific user story by ID |
| PUT    | `/api/user-stories/{id}?projectPath=<dir>` | Update an existing user story. Body → `{ "title": "...", "status": "in-progress" }` |
| DELETE | `/api/user-stories/{id}?projectPath=<dir>` | Delete a user story |
| PUT    | `/api/user-stories/{id}/tasks?projectPath=<dir>` | Set/replace associated tasks for a story. Body → `{ "taskIds": [1, 2, 3] }` |
| POST   | `/api/user-stories/{id}/tasks?projectPath=<dir>` | Add a single task to a story. Body → `{ "taskId": 1 }` |
| DELETE | `/api/user-stories/{id}/tasks/{taskId}?projectPath=<dir>` | Remove a single task from a story |
```
