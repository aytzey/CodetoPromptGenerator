const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld('api', {
    // Project API
    project: {
        getTree: (rootDir) => ipcRenderer.invoke('project:getTree', rootDir),
        getFiles: (rootDir, files) => ipcRenderer.invoke('project:getFiles', rootDir, files),
        calculateTokens: (rootDir, files) => ipcRenderer.invoke('project:calculateTokens', rootDir, files),
        updateItem: (rootDir, path, updates) => ipcRenderer.invoke('project:updateItem', rootDir, path, updates),
        search: (rootDir, query) => ipcRenderer.invoke('project:search', rootDir, query),
    },

    // AutoSelect API
    autoselect: {
        process: (prompt, rootDir, settings) => 
            ipcRenderer.invoke('autoselect:process', prompt, rootDir, settings),
        clarify: (prompt, rootDir, currentFiles, clarification) => 
            ipcRenderer.invoke('autoselect:clarify', prompt, rootDir, currentFiles, clarification),
    },

    // Exclusion API
    exclusion: {
        list: (rootDir) => ipcRenderer.invoke('exclusion:list', rootDir),
        save: (rootDir, exclusions) => ipcRenderer.invoke('exclusion:save', rootDir, exclusions),
    },

    // Prompt API
    prompt: {
        refine: (rawPrompt, context) => ipcRenderer.invoke('prompt:refine', rawPrompt, context),
        generate: (rootDir, files, userPrompt, options = {}) => 
            ipcRenderer.invoke('prompt:generate', rootDir, files, userPrompt, options),
    },

    // MetaPrompt API
    metaprompt: {
        list: () => ipcRenderer.invoke('metaprompt:list'),
        load: (filename) => ipcRenderer.invoke('metaprompt:load', filename),
        save: (filename, content) => ipcRenderer.invoke('metaprompt:save', filename, content),
        delete: (filename) => ipcRenderer.invoke('metaprompt:delete', filename),
    },

    // Kanban API
    kanban: {
        list: (projectPath) => ipcRenderer.invoke('kanban:list', projectPath),
        create: (projectPath, itemData) => ipcRenderer.invoke('kanban:create', projectPath, itemData),
        update: (projectPath, itemId, updates) => 
            ipcRenderer.invoke('kanban:update', projectPath, itemId, updates),
        delete: (projectPath, itemId) => ipcRenderer.invoke('kanban:delete', projectPath, itemId),
    },

    // Todo API
    todo: {
        list: (rootDir) => ipcRenderer.invoke('todo:list', rootDir),
        create: (rootDir, todo) => ipcRenderer.invoke('todo:create', rootDir, todo),
        update: (rootDir, todoId, updates) => ipcRenderer.invoke('todo:update', rootDir, todoId, updates),
        delete: (rootDir, todoId) => ipcRenderer.invoke('todo:delete', rootDir, todoId),
        toggle: (rootDir, todoId) => ipcRenderer.invoke('todo:toggle', rootDir, todoId),
    },

    // Actor API
    actor: {
        list: (rootDir) => ipcRenderer.invoke('actor:list', rootDir),
        create: (rootDir, actor) => ipcRenderer.invoke('actor:create', rootDir, actor),
        update: (rootDir, actorId, updates) => ipcRenderer.invoke('actor:update', rootDir, actorId, updates),
        delete: (rootDir, actorId) => ipcRenderer.invoke('actor:delete', rootDir, actorId),
    },

    // User Story API
    userstory: {
        list: (rootDir) => ipcRenderer.invoke('userstory:list', rootDir),
        create: (rootDir, story) => ipcRenderer.invoke('userstory:create', rootDir, story),
        update: (rootDir, storyId, updates) => ipcRenderer.invoke('userstory:update', rootDir, storyId, updates),
        delete: (rootDir, storyId) => ipcRenderer.invoke('userstory:delete', rootDir, storyId),
    },

    // Embeddings API
    embeddings: {
        generate: (rootDir, files) => ipcRenderer.invoke('embeddings:generate', rootDir, files),
        query: (rootDir, query, topK = 10) => ipcRenderer.invoke('embeddings:query', rootDir, query, topK),
    },

    // File Upload API
    upload: {
        process: (filePath, originalName) => ipcRenderer.invoke('upload:process', filePath, originalName),
    },

    // Token API
    token: {
        count: (text, model = 'gpt-3.5-turbo') => ipcRenderer.invoke('token:count', text, model),
    },

    // Export API
    export: {
        project: (rootDir, exportFormat, includeFiles, options = {}) => 
            ipcRenderer.invoke('export:project', rootDir, exportFormat, includeFiles, options),
    },

    // Generic IPC request handler (for any custom endpoints)
    request: (endpoint, payload) => ipcRenderer.invoke('ipc-request', endpoint, payload),
});