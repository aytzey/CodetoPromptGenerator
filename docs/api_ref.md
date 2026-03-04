# Python Backend API Reference

Last updated: 2026-03-04

## Base URL

Development default: `http://127.0.0.1:5010`

## Response Envelope

Most endpoints return:

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

Errors return:

```json
{
  "success": false,
  "error": "...",
  "message": "optional"
}
```

Some delete endpoints return HTTP `204` with an empty body.

## Health

- `GET /health`
- Returns `{ "status": "healthy" }`.

## Project Tree and Files

- `GET /api/projects/tree?rootDir=<absolute-path>`
- Builds recursive file tree for a project.

- `POST /api/projects/files`
- Body:

```json
{
  "baseDir": "/absolute/project/path",
  "paths": ["relative/path.ts", "src/file.py"]
}
```

- Returns file contents plus token counts.

## Folder/Drive Utilities

- `GET /api/drives`
- Returns top-level roots/mounts.

- `GET /api/select_drives`
- Legacy alias used by folder browser.

- `GET /api/browse_folders?path=<absolute-path>`
- Returns folders under the current path.

- `POST /api/resolveFolder`
- Body:

```json
{
  "folderName": "my-project"
}
```

- Resolves a folder name to an absolute path.

## Todos

- `GET /api/todos?projectPath=<optional-absolute-path>`
- `POST /api/todos?projectPath=<optional-absolute-path>`
- Body:

```json
{
  "text": "Task title",
  "createdAt": "optional ISO-8601"
}
```

- `PUT /api/todos/{id}?projectPath=<optional-absolute-path>`
- Body:

```json
{
  "completed": true
}
```

- `DELETE /api/todos/{id}?projectPath=<optional-absolute-path>`
- Returns `204` when deleted.

## Exclusions

- `GET /api/exclusions`
- `POST /api/exclusions`
- Body:

```json
{
  "exclusions": ["node_modules", "dist", "*.log"]
}
```

- `GET /api/localExclusions?projectPath=<absolute-path>`
- `POST /api/localExclusions?projectPath=<absolute-path>`
- Body:

```json
{
  "localExclusions": ["*.tmp", "build/"]
}
```

## Selection Groups

- `GET /api/selectionGroups?projectPath=<absolute-path>`
- Returns:

```json
{
  "Group A": ["src/index.ts", "src/lib/"]
}
```

- `POST /api/selectionGroups?projectPath=<absolute-path>`
- Body:

```json
{
  "groups": {
    "Group A": ["src/index.ts", "src/lib/"]
  }
}
```

Notes:
- Group names are non-empty strings.
- Paths are normalized to forward slashes.
- Duplicate/blank paths are removed before save.

## Kanban

- `GET /api/kanban?projectPath=<optional-absolute-path>`
- `POST /api/kanban?projectPath=<optional-absolute-path>`
- `PUT /api/kanban/{id}?projectPath=<optional-absolute-path>`
- `DELETE /api/kanban/{id}?projectPath=<optional-absolute-path>`

## User Stories

- `GET /api/user-stories?projectPath=<optional-absolute-path>`
- `POST /api/user-stories?projectPath=<optional-absolute-path>`
- `GET /api/user-stories/{id}?projectPath=<optional-absolute-path>`
- `PUT /api/user-stories/{id}?projectPath=<optional-absolute-path>`
- `DELETE /api/user-stories/{id}?projectPath=<optional-absolute-path>`
- `PUT /api/user-stories/{id}/tasks?projectPath=<optional-absolute-path>`
- `POST /api/user-stories/{id}/tasks?projectPath=<optional-absolute-path>`
- `DELETE /api/user-stories/{id}/tasks/{taskId}?projectPath=<optional-absolute-path>`

## Prompt Services

- `POST /api/prompt/refine`
- Body:

```json
{
  "text": "Prompt to refine",
  "treeText": "optional project-tree context"
}
```

- `POST /api/autoselect`
- Optional query: `?debug=1`
- Body follows `AutoSelectRequest` shape used by frontend.

## Codemap

- `POST /api/codemap/extract`
- Body:

```json
{
  "baseDir": "/absolute/project/path",
  "paths": ["relative/file1.ts", "relative/file2.py"]
}
```

## Meta Prompt Files

- `GET /api/metaprompts?action=list&dir=<optional-dir>`
- `GET /api/metaprompts?action=load&file=<filename>&dir=<optional-dir>`
- `POST /api/metaprompts?dir=<optional-dir>`
- Body:

```json
{
  "filename": "my-template",
  "content": "Prompt body"
}
```

## Token Count

- `POST /api/tokenCount`
- Body:

```json
{
  "text": "any text"
}
```

- Returns:

```json
{
  "success": true,
  "data": {
    "tokenCount": 123
  }
}
```
