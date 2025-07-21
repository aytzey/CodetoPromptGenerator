#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Service hook files that need refactoring
const serviceHookFiles = [
    'actorServiceHooks.ts',
    'actorSuggestServiceHooks.ts',
    'actorWizardServiceHooks.ts',
    'codemapServiceHooks.ts',
    'kanbanServiceHooks.ts',
    'selectionGroupServiceHooks.ts',
    'todoServiceHooks.ts',
    'userStoryServiceHooks.ts',
];

// Mapping of API endpoints to IPC service methods
const apiToIpcMapping = {
    // Actor endpoints
    '/api/actors': {
        GET: 'ipcService.actor.list',
        POST: 'ipcService.actor.create',
    },
    '/api/actors/:id': {
        PUT: 'ipcService.actor.update',
        DELETE: 'ipcService.actor.delete',
    },
    
    // Todo endpoints
    '/api/todos': {
        GET: 'ipcService.todo.list',
        POST: 'ipcService.todo.create',
    },
    '/api/todos/:id': {
        PUT: 'ipcService.todo.update',
        DELETE: 'ipcService.todo.delete',
    },
    '/api/todos/:id/toggle': {
        POST: 'ipcService.todo.toggle',
    },
    
    // Kanban endpoints
    '/api/kanban/boards': {
        GET: 'ipcService.kanban.boards.list',
        POST: 'ipcService.kanban.boards.create',
    },
    '/api/kanban/boards/:id': {
        GET: 'ipcService.kanban.boards.get',
        PUT: 'ipcService.kanban.boards.update',
        DELETE: 'ipcService.kanban.boards.delete',
    },
    '/api/kanban/boards/:boardId/cards': {
        POST: 'ipcService.kanban.cards.create',
    },
    '/api/kanban/boards/:boardId/cards/:cardId': {
        PUT: 'ipcService.kanban.cards.update',
        DELETE: 'ipcService.kanban.cards.delete',
    },
    '/api/kanban/boards/:boardId/cards/:cardId/move': {
        POST: 'ipcService.kanban.cards.move',
    },
    
    // User Story endpoints
    '/api/user-stories': {
        GET: 'ipcService.userstory.list',
        POST: 'ipcService.userstory.create',
    },
    '/api/user-stories/:id': {
        PUT: 'ipcService.userstory.update',
        DELETE: 'ipcService.userstory.delete',
    },
    
    // Embeddings endpoints
    '/api/embeddings/generate': {
        POST: 'ipcService.embeddings.generate',
    },
    '/api/embeddings/query': {
        POST: 'ipcService.embeddings.query',
    },
    
    // Token endpoints
    '/api/tokens': {
        POST: 'ipcService.token.count',
    },
};

function generateRefactoringGuide() {
    console.log('# Service Hook Refactoring Guide\n');
    console.log('This guide shows how to refactor each service hook file from REST API to IPC.\n');
    
    serviceHookFiles.forEach(file => {
        console.log(`## ${file}\n`);
        console.log('1. Replace import:');
        console.log('   FROM: `import { fetchApi } from "./apiService";`');
        console.log('   TO:   `import { ipcService } from "./ipcService";`\n');
        console.log('2. Update API calls based on the patterns below:\n');
        
        // Generate examples based on file type
        if (file.includes('actor')) {
            console.log('   - List actors:');
            console.log('     FROM: `fetchApi<Actor[]>("/api/actors")`');
            console.log('     TO:   `ipcService.actor.list(projectPath)`\n');
            console.log('   - Create actor:');
            console.log('     FROM: `fetchApi<Actor>("/api/actors", { method: "POST", body: JSON.stringify(actor) })`');
            console.log('     TO:   `ipcService.actor.create(projectPath, actor)`\n');
        } else if (file.includes('todo')) {
            console.log('   - List todos:');
            console.log('     FROM: `fetchApi<Todo[]>("/api/todos")`');
            console.log('     TO:   `ipcService.todo.list(projectPath)`\n');
            console.log('   - Toggle todo:');
            console.log('     FROM: `fetchApi<Todo>(`/api/todos/${id}/toggle`, { method: "POST" })`');
            console.log('     TO:   `ipcService.todo.toggle(projectPath, id)`\n');
        } else if (file.includes('kanban')) {
            console.log('   - List boards:');
            console.log('     FROM: `fetchApi<KanbanBoard[]>("/api/kanban/boards")`');
            console.log('     TO:   `ipcService.kanban.boards.list(projectPath)`\n');
            console.log('   - Move card:');
            console.log('     FROM: `fetchApi<KanbanCard>(`/api/kanban/boards/${boardId}/cards/${cardId}/move`, { method: "POST", body: JSON.stringify({ targetColumn, targetPosition }) })`');
            console.log('     TO:   `ipcService.kanban.cards.move(projectPath, boardId, cardId, targetColumn, targetPosition)`\n');
        }
        
        console.log('---\n');
    });
}

// Generate the guide
generateRefactoringGuide();