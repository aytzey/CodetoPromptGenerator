# Python Backend – REST API Reference

> **Base URL (dev):** `http://127.0.0.1:5000`
>
> All endpoints are JSON‑based and live under the `/api/` prefix except the simple health‑check.

---

## 1 · Service & Diagnostics

| Method | Path          | Purpose                               |
| ------ | ------------- | ------------------------------------- |
| GET    | `/health`     | Quick liveness probe (no auth needed) |

**Response 200**
```json
{ "status": "healthy", "service": "python_backend" }
```

---

## 2 · Todo Management

| Method | Path                                   | Notes |
| ------ | -------------------------------------- | ----- |
| GET    | `/api/todos?projectPath=<dir>`         | List todos (global if `projectPath` omitted) |
| POST   | `/api/todos?projectPath=<dir>`         | Add new todo <br>Body ➜ `{ "text": "…", "createdAt?": "ISO8601" }` |
| PUT    | `/api/todos/{id}?projectPath=<dir>`    | Toggle completion <br>Body ➜ `{ "completed": true }` |
| DELETE | `/api/todos/{id}?projectPath=<dir>`    | Remove todo |

Fields returned:
```json
{ "id": 1713349487123, "text": "Sample", "completed": false, "createdAt": "2025-04-17T21:10:00Z" }
```

---

## 3 · Exclusions

### 3.1 Global (`ignoreDirs.txt`)
| Method | Path           | Body / Query | Result |
| ------ | -------------- | ------------ | ------ |
| GET    | `/api/exclusions` | –          | `string[]` list |
| POST   | `/api/exclusions` | `{ "exclusions": ["node_modules", "dist"] }` | updated list |

### 3.2 Local (per project)
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET    | `/api/localExclusions?projectPath=<dir>` | Returns project‑specific ignore list |
| POST   | `/api/localExclusions?projectPath=<dir>` | Body ➜ `{ "localExclusions": ["*.log", "build"] }` |

---

## 4 · Project Navigation & Files

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/api/projects/tree?rootDir=<dir>` | Recursive file & folder tree (respects global ignores) |
| POST   | `/api/projects/files`              | Body ➜ `{ "baseDir": "<dir>", "paths": ["src/app.ts", "README.md"] }` → returns file content + token counts |
| GET    | `/api/browse_folders?path=<dir>`   | Shallow sub‑folder list + parent info |
| GET    | `/api/select_drives`               | Lists drives (Windows) or common roots (Unix) |

---

## 5 · Meta Prompts

| Method | Path                                   | Purpose |
| ------ | -------------------------------------- | ------- |
| GET    | `/api/metaprompts?action=list&dir=<opt>` | List `.txt` prompts in directory |
| GET    | `/api/metaprompts?action=load&file=<name>&dir=<opt>` | Load one prompt’s text |
| POST   | `/api/metaprompts?dir=<opt>`             | Save/update prompt<br>Body ➜ `{ "filename": "my.md", "content": "…" }` |

*`dir` parameter is optional; defaults to `sample_project/meta_prompts`.*

---

## 6 · Utility Endpoints

| Method | Path                 | Purpose |
| ------ | -------------------- | ------- |
| POST   | `/api/resolveFolder` | Body ➜ `{ "folderName": "my‑project" }` → returns absolute path resolution |
| POST   | `/api/tokenCount`    | Body ➜ `{ "text": "Arbitrary string" }` → `{ "tokenCount": 42 }` |

---

### Error Format (all endpoints)
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "Detailed description"
}
```
Successful requests return:
```json
{ "success": true, "data": …, "message?": "…" }
```

---

## Quick Usage Example (cURL)
```bash
# List project tree
curl -X GET \
  "http://127.0.0.1:5000/api/projects/tree?rootDir=/home/user/project"

# Add a todo
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text":"Write docs"}' \
  "http://127.0.0.1:5000/api/todos?projectPath=/home/user/project"
```

---

**Contact / Issues**  
Report backend issues in the server logs or open a ticket in the repo. All endpoints are intentionally unauthenticated for local testing—add auth middleware before production.

