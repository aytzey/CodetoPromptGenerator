import { useAppStore } from '../stores/useAppStore';
import { fetchApi } from './apiService';

// Type definitions for the window.api object
interface WindowWithAPI extends Window {
    api?: any;
}

// Check if we're running in Electron
function isElectron(): boolean {
    const windowWithAPI = window as WindowWithAPI;
    return !!(windowWithAPI.api && typeof windowWithAPI.api === 'object');
}

// IPC response format
interface IPCResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// Generic request wrapper that works for both IPC and HTTP
async function universalRequest<T = any>(
    ipcMethod: () => Promise<any>,
    httpEndpoint: string,
    httpOptions: RequestInit = {},
    errorContext: string
): Promise<T> {
    const { setError } = useAppStore.getState();

    try {
        if (isElectron()) {
            // Use IPC in Electron
            const response = await ipcMethod();
            
            if (response && typeof response === 'object' && 'success' in response) {
                if (!response.success) {
                    const errorMessage = response.error || 'Unknown error occurred';
                    setError({
                        message: errorMessage,
                        context: errorContext,
                    });
                    throw new Error(errorMessage);
                }
                return response.data as T;
            }
            
            return response as T;
        } else {
            // Use HTTP API in browser
            const result = await fetchApi<T>(httpEndpoint, httpOptions);
            if (result === null) {
                throw new Error(`${errorContext}: Request failed`);
            }
            return result;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError({
            message: errorMessage,
            context: errorContext,
        });
        throw error;
    }
}

// Helper to get the API when in Electron
function getAPI() {
    const windowWithAPI = window as WindowWithAPI;
    if (!windowWithAPI.api) {
        throw new Error('IPC API not available');
    }
    return windowWithAPI.api;
}

// Export unified service that works in both Electron and browser
export const unifiedService = {
    // Project methods
    project: {
        getTree: (rootDir: string) =>
            universalRequest(
                () => getAPI().project.getTree(rootDir),
                `/api/project/tree?rootDir=${encodeURIComponent(rootDir)}`,
                { method: 'GET' },
                'Failed to get project tree'
            ),
        
        getFiles: (rootDir: string, files: string[]) =>
            universalRequest(
                () => getAPI().project.getFiles(rootDir, files),
                '/api/project/files',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, files })
                },
                'Failed to get file contents'
            ),
        
        calculateTokens: (rootDir: string, files: string[]) =>
            universalRequest(
                () => getAPI().project.calculateTokens(rootDir, files),
                '/api/project/calculate-tokens',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, files })
                },
                'Failed to calculate tokens'
            ),
        
        updateItem: (rootDir: string, path: string, updates: any) =>
            universalRequest(
                () => getAPI().project.updateItem(rootDir, path, updates),
                '/api/project/update-item',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, path, updates })
                },
                'Failed to update item'
            ),
        
        search: (rootDir: string, query: string) =>
            universalRequest(
                () => getAPI().project.search(rootDir, query),
                `/api/project/search?rootDir=${encodeURIComponent(rootDir)}&query=${encodeURIComponent(query)}`,
                { method: 'GET' },
                'Failed to search files'
            ),
    },

    // AutoSelect methods
    autoselect: {
        process: (prompt: string, rootDir: string, settings: any) =>
            universalRequest(
                () => getAPI().autoselect.process(prompt, rootDir, settings),
                '/api/autoselect/process',
                { 
                    method: 'POST',
                    body: JSON.stringify({ prompt, rootDir, settings })
                },
                'Failed to auto-select files'
            ),
        
        clarify: (prompt: string, rootDir: string, currentFiles: string[], clarification: string) =>
            universalRequest(
                () => getAPI().autoselect.clarify(prompt, rootDir, currentFiles, clarification),
                '/api/autoselect/clarify',
                { 
                    method: 'POST',
                    body: JSON.stringify({ prompt, rootDir, currentFiles, clarification })
                },
                'Failed to clarify selection'
            ),
    },

    // Exclusion methods
    exclusion: {
        list: (rootDir: string) =>
            universalRequest(
                () => getAPI().exclusion.list(rootDir),
                `/api/exclusions?rootDir=${encodeURIComponent(rootDir)}`,
                { method: 'GET' },
                'Failed to get exclusions'
            ),
        
        save: (rootDir: string, exclusions: string[]) =>
            universalRequest(
                () => getAPI().exclusion.save(rootDir, exclusions),
                '/api/exclusions',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, exclusions })
                },
                'Failed to save exclusions'
            ),
    },

    // Prompt methods
    prompt: {
        refine: (rawPrompt: string, context: any) =>
            universalRequest(
                () => getAPI().prompt.refine(rawPrompt, context),
                '/api/prompt/refine',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rawPrompt, context })
                },
                'Failed to refine prompt'
            ),
        
        generate: (rootDir: string, files: string[], userPrompt: string, options: any = {}) =>
            universalRequest(
                () => getAPI().prompt.generate(rootDir, files, userPrompt, options),
                '/api/prompt/generate',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, files, userPrompt, options })
                },
                'Failed to generate prompt'
            ),
    },

    // Kanban methods
    kanban: {
        list: (projectPath: string) =>
            universalRequest(
                () => getAPI().kanban.list(projectPath),
                `/api/kanban?projectPath=${encodeURIComponent(projectPath)}`,
                { method: 'GET' },
                'Failed to list kanban items'
            ),
        
        create: (projectPath: string, itemData: any) =>
            universalRequest(
                () => getAPI().kanban.create(projectPath, itemData),
                '/api/kanban',
                { 
                    method: 'POST',
                    body: JSON.stringify({ projectPath, ...itemData })
                },
                'Failed to create kanban item'
            ),
        
        update: (projectPath: string, itemId: number, updates: any) =>
            universalRequest(
                () => getAPI().kanban.update(projectPath, itemId, updates),
                `/api/kanban/${itemId}`,
                { 
                    method: 'PATCH',
                    body: JSON.stringify({ projectPath, ...updates })
                },
                'Failed to update kanban item'
            ),
        
        delete: (projectPath: string, itemId: number) =>
            universalRequest(
                () => getAPI().kanban.delete(projectPath, itemId),
                `/api/kanban/${itemId}?projectPath=${encodeURIComponent(projectPath)}`,
                { method: 'DELETE' },
                'Failed to delete kanban item'
            ),
    },

    // Todo methods
    todo: {
        list: (rootDir: string) =>
            universalRequest(
                () => getAPI().todo.list(rootDir),
                `/api/todos?rootDir=${encodeURIComponent(rootDir)}`,
                { method: 'GET' },
                'Failed to list todos'
            ),
        
        create: (rootDir: string, todo: any) =>
            universalRequest(
                () => getAPI().todo.create(rootDir, todo),
                '/api/todos',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, ...todo })
                },
                'Failed to create todo'
            ),
        
        update: (rootDir: string, todoId: string, updates: any) =>
            universalRequest(
                () => getAPI().todo.update(rootDir, todoId, updates),
                `/api/todos/${todoId}`,
                { 
                    method: 'PATCH',
                    body: JSON.stringify({ rootDir, ...updates })
                },
                'Failed to update todo'
            ),
        
        delete: (rootDir: string, todoId: string) =>
            universalRequest(
                () => getAPI().todo.delete(rootDir, todoId),
                `/api/todos/${todoId}?rootDir=${encodeURIComponent(rootDir)}`,
                { method: 'DELETE' },
                'Failed to delete todo'
            ),
        
        toggle: (rootDir: string, todoId: string) =>
            universalRequest(
                () => getAPI().todo.toggle(rootDir, todoId),
                `/api/todos/${todoId}/toggle`,
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir })
                },
                'Failed to toggle todo'
            ),
    },

    // Actor methods
    actor: {
        list: (rootDir: string) =>
            universalRequest(
                () => getAPI().actor.list(rootDir),
                `/api/actors?rootDir=${encodeURIComponent(rootDir)}`,
                { method: 'GET' },
                'Failed to list actors'
            ),
        
        create: (rootDir: string, actor: any) =>
            universalRequest(
                () => getAPI().actor.create(rootDir, actor),
                '/api/actors',
                { 
                    method: 'POST',
                    body: JSON.stringify({ rootDir, ...actor })
                },
                'Failed to create actor'
            ),
        
        update: (rootDir: string, actorId: string, updates: any) =>
            universalRequest(
                () => getAPI().actor.update(rootDir, actorId, updates),
                `/api/actors/${actorId}`,
                { 
                    method: 'PATCH',
                    body: JSON.stringify({ rootDir, ...updates })
                },
                'Failed to update actor'
            ),
        
        delete: (rootDir: string, actorId: string) =>
            universalRequest(
                () => getAPI().actor.delete(rootDir, actorId),
                `/api/actors/${actorId}?rootDir=${encodeURIComponent(rootDir)}`,
                { method: 'DELETE' },
                'Failed to delete actor'
            ),
    },

    // Token methods
    token: {
        count: (text: string, model: string = 'gpt-3.5-turbo') =>
            universalRequest(
                () => getAPI().token.count(text, model),
                '/api/token/count',
                { 
                    method: 'POST',
                    body: JSON.stringify({ text, model })
                },
                'Failed to count tokens'
            ),
    },
};