import { useAppStore } from '../stores/useAppStore';

// Type definitions for the window.api object
interface WindowWithAPI extends Window {
    api?: {
        project: {
            getTree: (rootDir: string) => Promise<any>;
            getFiles: (rootDir: string, files: string[]) => Promise<any>;
            calculateTokens: (rootDir: string, files: string[]) => Promise<any>;
            updateItem: (rootDir: string, path: string, updates: any) => Promise<any>;
            search: (rootDir: string, query: string) => Promise<any>;
        };
        autoselect: {
            process: (prompt: string, rootDir: string, settings: any) => Promise<any>;
            clarify: (prompt: string, rootDir: string, currentFiles: string[], clarification: string) => Promise<any>;
        };
        exclusion: {
            list: (rootDir: string) => Promise<any>;
            save: (rootDir: string, exclusions: string[]) => Promise<any>;
        };
        prompt: {
            refine: (rawPrompt: string, context: any) => Promise<any>;
            generate: (rootDir: string, files: string[], userPrompt: string, options?: any) => Promise<any>;
        };
        metaprompt: {
            list: () => Promise<any>;
            load: (filename: string) => Promise<any>;
            save: (filename: string, content: string) => Promise<any>;
            delete: (filename: string) => Promise<any>;
        };
        kanban: {
            list: (projectPath: string) => Promise<any>;
            create: (projectPath: string, itemData: any) => Promise<any>;
            update: (projectPath: string, itemId: number, updates: any) => Promise<any>;
            delete: (projectPath: string, itemId: number) => Promise<any>;
        };
        todo: {
            list: (rootDir: string) => Promise<any>;
            create: (rootDir: string, todo: any) => Promise<any>;
            update: (rootDir: string, todoId: string, updates: any) => Promise<any>;
            delete: (rootDir: string, todoId: string) => Promise<any>;
            toggle: (rootDir: string, todoId: string) => Promise<any>;
        };
        actor: {
            list: (rootDir: string) => Promise<any>;
            create: (rootDir: string, actor: any) => Promise<any>;
            update: (rootDir: string, actorId: string, updates: any) => Promise<any>;
            delete: (rootDir: string, actorId: string) => Promise<any>;
        };
        userstory: {
            list: (rootDir: string) => Promise<any>;
            create: (rootDir: string, story: any) => Promise<any>;
            update: (rootDir: string, storyId: string, updates: any) => Promise<any>;
            delete: (rootDir: string, storyId: string) => Promise<any>;
        };
        embeddings: {
            generate: (rootDir: string, files: string[]) => Promise<any>;
            query: (rootDir: string, query: string, topK?: number) => Promise<any>;
        };
        upload: {
            process: (filePath: string, originalName: string) => Promise<any>;
        };
        token: {
            count: (text: string, model?: string) => Promise<any>;
        };
        export: {
            project: (rootDir: string, exportFormat: string, includeFiles: string[], options?: any) => Promise<any>;
        };
        request: (endpoint: string, payload: any) => Promise<any>;
    };
}

// IPC response format
interface IPCResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// Helper to access the API
function getAPI() {
    const windowWithAPI = window as WindowWithAPI;
    if (!windowWithAPI.api) {
        console.error('IPC API not available. Are you running in Electron?');
        throw new Error('IPC API not available');
    }
    return windowWithAPI.api;
}

// Generic IPC request wrapper with error handling
export async function ipcRequest<T = any>(
    apiMethod: () => Promise<any>,
    errorContext: string
): Promise<T> {
    const { setError } = useAppStore.getState();

    try {
        const response = await apiMethod();
        
        // The IPC bridge returns { success: boolean, data?: T, error?: string }
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
        
        // If response doesn't follow expected format, return as is
        return response as T;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError({
            message: errorMessage,
            context: errorContext,
        });
        throw error;
    }
}

// Export all IPC service methods
export const ipcService = {
    // Project methods
    project: {
        getTree: (rootDir: string) =>
            ipcRequest(() => getAPI().project.getTree(rootDir), 'Failed to get project tree'),
        
        getFiles: (rootDir: string, files: string[]) =>
            ipcRequest(() => getAPI().project.getFiles(rootDir, files), 'Failed to get file contents'),
        
        calculateTokens: (rootDir: string, files: string[]) =>
            ipcRequest(() => getAPI().project.calculateTokens(rootDir, files), 'Failed to calculate tokens'),
        
        updateItem: (rootDir: string, path: string, updates: any) =>
            ipcRequest(() => getAPI().project.updateItem(rootDir, path, updates), 'Failed to update item'),
        
        search: (rootDir: string, query: string) =>
            ipcRequest(() => getAPI().project.search(rootDir, query), 'Failed to search files'),
    },

    // AutoSelect methods
    autoselect: {
        process: (prompt: string, rootDir: string, settings: any) =>
            ipcRequest(() => getAPI().autoselect.process(prompt, rootDir, settings), 'Failed to auto-select files'),
        
        clarify: (prompt: string, rootDir: string, currentFiles: string[], clarification: string) =>
            ipcRequest(() => getAPI().autoselect.clarify(prompt, rootDir, currentFiles, clarification), 'Failed to clarify selection'),
    },

    // Exclusion methods
    exclusion: {
        list: (rootDir: string) =>
            ipcRequest(() => getAPI().exclusion.list(rootDir), 'Failed to get exclusions'),
        
        save: (rootDir: string, exclusions: string[]) =>
            ipcRequest(() => getAPI().exclusion.save(rootDir, exclusions), 'Failed to save exclusions'),
    },

    // Prompt methods
    prompt: {
        refine: (rawPrompt: string, context: any) =>
            ipcRequest(() => getAPI().prompt.refine(rawPrompt, context), 'Failed to refine prompt'),
        
        generate: (rootDir: string, files: string[], userPrompt: string, options: any = {}) =>
            ipcRequest(() => getAPI().prompt.generate(rootDir, files, userPrompt, options), 'Failed to generate prompt'),
    },

    // MetaPrompt methods
    metaprompt: {
        list: () =>
            ipcRequest(() => getAPI().metaprompt.list(), 'Failed to list metaprompts'),
        
        load: (filename: string) =>
            ipcRequest(() => getAPI().metaprompt.load(filename), 'Failed to load metaprompt'),
        
        save: (filename: string, content: string) =>
            ipcRequest(() => getAPI().metaprompt.save(filename, content), 'Failed to save metaprompt'),
        
        delete: (filename: string) =>
            ipcRequest(() => getAPI().metaprompt.delete(filename), 'Failed to delete metaprompt'),
    },

    // Kanban methods
    kanban: {
        list: (projectPath: string) =>
            ipcRequest(() => getAPI().kanban.list(projectPath), 'Failed to list kanban items'),
        
        create: (projectPath: string, itemData: any) =>
            ipcRequest(() => getAPI().kanban.create(projectPath, itemData), 'Failed to create kanban item'),
        
        update: (projectPath: string, itemId: number, updates: any) =>
            ipcRequest(() => getAPI().kanban.update(projectPath, itemId, updates), 'Failed to update kanban item'),
        
        delete: (projectPath: string, itemId: number) =>
            ipcRequest(() => getAPI().kanban.delete(projectPath, itemId), 'Failed to delete kanban item'),
    },

    // Todo methods
    todo: {
        list: (rootDir: string) =>
            ipcRequest(() => getAPI().todo.list(rootDir), 'Failed to list todos'),
        
        create: (rootDir: string, todo: any) =>
            ipcRequest(() => getAPI().todo.create(rootDir, todo), 'Failed to create todo'),
        
        update: (rootDir: string, todoId: string, updates: any) =>
            ipcRequest(() => getAPI().todo.update(rootDir, todoId, updates), 'Failed to update todo'),
        
        delete: (rootDir: string, todoId: string) =>
            ipcRequest(() => getAPI().todo.delete(rootDir, todoId), 'Failed to delete todo'),
        
        toggle: (rootDir: string, todoId: string) =>
            ipcRequest(() => getAPI().todo.toggle(rootDir, todoId), 'Failed to toggle todo'),
    },

    // Actor methods
    actor: {
        list: (rootDir: string) =>
            ipcRequest(() => getAPI().actor.list(rootDir), 'Failed to list actors'),
        
        create: (rootDir: string, actor: any) =>
            ipcRequest(() => getAPI().actor.create(rootDir, actor), 'Failed to create actor'),
        
        update: (rootDir: string, actorId: string, updates: any) =>
            ipcRequest(() => getAPI().actor.update(rootDir, actorId, updates), 'Failed to update actor'),
        
        delete: (rootDir: string, actorId: string) =>
            ipcRequest(() => getAPI().actor.delete(rootDir, actorId), 'Failed to delete actor'),
    },

    // User Story methods
    userstory: {
        list: (rootDir: string) =>
            ipcRequest(() => getAPI().userstory.list(rootDir), 'Failed to list user stories'),
        
        create: (rootDir: string, story: any) =>
            ipcRequest(() => getAPI().userstory.create(rootDir, story), 'Failed to create user story'),
        
        update: (rootDir: string, storyId: string, updates: any) =>
            ipcRequest(() => getAPI().userstory.update(rootDir, storyId, updates), 'Failed to update user story'),
        
        delete: (rootDir: string, storyId: string) =>
            ipcRequest(() => getAPI().userstory.delete(rootDir, storyId), 'Failed to delete user story'),
    },

    // Embeddings methods
    embeddings: {
        generate: (rootDir: string, files: string[]) =>
            ipcRequest(() => getAPI().embeddings.generate(rootDir, files), 'Failed to generate embeddings'),
        
        query: (rootDir: string, query: string, topK: number = 10) =>
            ipcRequest(() => getAPI().embeddings.query(rootDir, query, topK), 'Failed to query embeddings'),
    },

    // Upload methods
    upload: {
        process: (filePath: string, originalName: string) =>
            ipcRequest(() => getAPI().upload.process(filePath, originalName), 'Failed to process upload'),
    },

    // Token methods
    token: {
        count: (text: string, model: string = 'gpt-3.5-turbo') =>
            ipcRequest(() => getAPI().token.count(text, model), 'Failed to count tokens'),
    },

    // Export methods
    export: {
        project: (rootDir: string, exportFormat: string, includeFiles: string[], options: any = {}) =>
            ipcRequest(() => getAPI().export.project(rootDir, exportFormat, includeFiles, options), 'Failed to export project'),
    },

    // Generic request method for custom endpoints
    request: (endpoint: string, payload: any = {}) =>
        ipcRequest(() => getAPI().request(endpoint, payload), `Failed to execute ${endpoint}`),
};