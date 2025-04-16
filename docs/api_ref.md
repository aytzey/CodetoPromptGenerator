# Python Backend – REST API Reference  (2025‑04‑17)

> **Base URL (dev)** `http://127.0.0.1:5000`

All responses follow the envelope  
`{ "success": <bool>, "data?": <any>, "message?|error?": <string> }`.

---

## 1 · Service & Diagnostics
| Method | Path      | Purpose                       |
| ------ | --------- | ----------------------------- |
| GET    | `/health` | Quick liveness probe          |

---

## 2 · Todo Management
| Method | Path                                   | Notes |
| ------ | -------------------------------------- | ----- |
| GET    | `/api/todos?projectPath=<dir>`         | List todos (global if omitted) |
| POST   | idem                                   | Add new todo. Body → `{ "text": "…", "createdAt?": "ISO8601" }` |
| PUT    | `/api/todos/{id}?projectPath=<dir>`    | Toggle completion. Body → `{ "completed": true }` |
| DELETE | `/api/todos/{id}?projectPath=<dir>`    | Remove todo |

---

## 3 · Exclusions
### 3.1 Global (`ignoreDirs.txt`)
| GET  | `/api/exclusions` | → `string[]` |
| POST | `/api/exclusions` | Body → `{ "exclusions": ["node_modules", "dist"] }` |

### 3.2 Local (per project)
| GET  | `/api/localExclusions?projectPath=<dir>` | project‑specific ignore list |
| POST | idem                                     | Body → `{ "localExclusions": ["*.log"] }` |

---

## 4 · Navigation & Files
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET  | `/api/select_drives` | Drives / root folders (legacy path) |
| GET  | `/api/drives`        | Same as above – preferred modern path |
| GET  | `/api/browse_folders?path=<dir>` | Immediate sub‑folders of *path* |
| GET  | `/api/projects/tree?rootDir=<dir>` | Recursive tree (honours global ignores) |
| POST | `/api/projects/files` | Body → `{ "baseDir": "<dir>", "paths": ["rel/a.ts", …] }` → content + token counts |
| POST | `/api/resolveFolder`  | Body → `{ "folderName": "my‑proj" }` → absolute path |

---

## 5 · Meta Prompts
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET    | `/api/metaprompts?action=list&dir=<opt>` | List prompt files |
| GET    | `/api/metaprompts?action=load&file=<name>&dir=<opt>` | Load one file |
| POST   | `/api/metaprompts?dir=<opt>` | Save/update prompt |

---

## 6 · Utility
| Method | Path              | Purpose                |
| ------ | ----------------- | ---------------------- |
| POST   | `/api/tokenCount` | `{ text }` → tokens |

---

### Error example
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "folderName is required"
}
