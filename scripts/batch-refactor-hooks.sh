#!/bin/bash

# This script helps refactor the remaining service hooks to use IPC

echo "Refactoring remaining service hooks..."

# Actor service hooks
echo "Refactoring actorServiceHooks.ts..."
sed -i "s|import { fetchApi } from './apiService';|import { ipcService } from './ipcService';|g" services/actorServiceHooks.ts
sed -i "s|fetchApi<Actor\[\]>('/api/actors')|ipcService.actor.list(projectPath)|g" services/actorServiceHooks.ts
sed -i "s|fetchApi<Actor>('/api/actors', {|ipcService.actor.create(projectPath,|g" services/actorServiceHooks.ts
sed -i 's|method: "POST",.*body: JSON.stringify(actor).*})|actor)|g' services/actorServiceHooks.ts
sed -i "s|fetchApi<Actor>(\`/api/actors/\${actorId}\`, {|ipcService.actor.update(projectPath, actorId,|g" services/actorServiceHooks.ts
sed -i 's|method: "PUT",.*body: JSON.stringify(updates).*})|updates)|g' services/actorServiceHooks.ts
sed -i "s|fetchApi<void>(\`/api/actors/\${actorId}\`, { method: 'DELETE' })|ipcService.actor.delete(projectPath, actorId)|g" services/actorServiceHooks.ts

# Todo service hooks
echo "Refactoring todoServiceHooks.ts..."
sed -i "s|import { fetchApi } from '@/services/apiService';|import { ipcService } from '@/services/ipcService';|g" services/todoServiceHooks.ts
sed -i "s|fetchApi<Todo\[\]>('/api/todos')|ipcService.todo.list(projectPath)|g" services/todoServiceHooks.ts
sed -i "s|fetchApi<Todo>('/api/todos', {|ipcService.todo.create(projectPath,|g" services/todoServiceHooks.ts
sed -i 's|method: "POST",.*body: JSON.stringify(todo).*})|todo)|g' services/todoServiceHooks.ts
sed -i "s|fetchApi<Todo>(\`/api/todos/\${todoId}\`, {|ipcService.todo.update(projectPath, todoId,|g" services/todoServiceHooks.ts
sed -i 's|method: "PUT",.*body: JSON.stringify(updates).*})|updates)|g' services/todoServiceHooks.ts
sed -i "s|fetchApi<void>(\`/api/todos/\${todoId}\`, { method: 'DELETE' })|ipcService.todo.delete(projectPath, todoId)|g" services/todoServiceHooks.ts
sed -i "s|fetchApi<Todo>(\`/api/todos/\${todoId}/toggle\`, { method: 'POST' })|ipcService.todo.toggle(projectPath, todoId)|g" services/todoServiceHooks.ts

# User Story service hooks
echo "Refactoring userStoryServiceHooks.ts..."
sed -i "s|import { fetchApi } from '@/services/apiService';|import { ipcService } from '@/services/ipcService';|g" services/userStoryServiceHooks.ts
sed -i "s|fetchApi<UserStory\[\]>('/api/user-stories')|ipcService.userstory.list(projectPath)|g" services/userStoryServiceHooks.ts
sed -i "s|fetchApi<UserStory>('/api/user-stories', {|ipcService.userstory.create(projectPath,|g" services/userStoryServiceHooks.ts
sed -i 's|method: "POST",.*body: JSON.stringify(story).*})|story)|g' services/userStoryServiceHooks.ts
sed -i "s|fetchApi<UserStory>(\`/api/user-stories/\${storyId}\`, {|ipcService.userstory.update(projectPath, storyId,|g" services/userStoryServiceHooks.ts
sed -i 's|method: "PUT",.*body: JSON.stringify(updates).*})|updates)|g' services/userStoryServiceHooks.ts
sed -i "s|fetchApi<void>(\`/api/user-stories/\${storyId}\`, { method: 'DELETE' })|ipcService.userstory.delete(projectPath, storyId)|g" services/userStoryServiceHooks.ts

echo "Refactoring complete! Please manually review the changes to ensure they are correct."