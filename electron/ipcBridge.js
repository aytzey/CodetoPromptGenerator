const { spawn } = require('child_process');
const { ipcMain } = require('electron');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class IPCBridge {
    constructor() {
        this.pythonProcess = null;
        this.pendingRequests = new Map();
        this.isInitialized = false;
        this.buffer = '';
    }

    /**
     * Initialize the Python IPC process
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        
        // Clear any existing handlers to prevent duplicates
        this.clearHandlers();

        try {
            // Get the path to the Python IPC handler
            // Use the venv Python to ensure all dependencies are available
            const venvPath = path.join(__dirname, '..', 'python_backend', 'venv');
            const pythonPath = process.platform === 'win32' 
                ? path.join(venvPath, 'Scripts', 'python.exe')
                : path.join(venvPath, 'bin', 'python');
            const ipcHandlerPath = path.join(__dirname, '..', 'python_backend', 'ipc_handler.py');

            // Spawn the Python process
            this.pythonProcess = spawn(pythonPath, [ipcHandlerPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, PYTHONUNBUFFERED: '1' }
            });

            // Handle stdout (responses from Python)
            this.pythonProcess.stdout.on('data', (data) => {
                this.buffer += data.toString();
                this.processBuffer();
            });

            // Handle stderr (errors and logs from Python)
            this.pythonProcess.stderr.on('data', (data) => {
                console.error('[Python]', data.toString());
            });

            // Handle process errors
            this.pythonProcess.on('error', (error) => {
                console.error('Failed to start Python process:', error);
                this.handleProcessError(error);
            });

            // Handle process exit
            this.pythonProcess.on('exit', (code, signal) => {
                console.log(`Python process exited with code ${code} and signal ${signal}`);
                this.handleProcessExit(code, signal);
            });

            this.isInitialized = true;
            console.log('IPC Bridge initialized successfully');

            // Register IPC handlers
            this.registerHandlers();
        } catch (error) {
            console.error('Failed to initialize IPC Bridge:', error);
            throw error;
        }
    }

    /**
     * Process buffered data from Python stdout
     */
    processBuffer() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const response = JSON.parse(line);
                    this.handleResponse(response);
                } catch (error) {
                    console.error('Failed to parse response:', error, 'Line:', line);
                }
            }
        }
    }

    /**
     * Handle response from Python process
     */
    handleResponse(response) {
        const { id, success, result, error } = response;
        const pending = this.pendingRequests.get(id);

        if (!pending) {
            console.warn('Received response for unknown request:', id);
            return;
        }

        clearTimeout(pending.timeout);
        this.pendingRequests.delete(id);

        if (success) {
            pending.resolve(result);
        } else {
            pending.reject(new Error(error || 'Unknown error'));
        }
    }

    /**
     * Handle Python process errors
     */
    handleProcessError(error) {
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(`Python process error: ${error.message}`));
        }
        this.pendingRequests.clear();
        this.isInitialized = false;
    }

    /**
     * Handle Python process exit
     */
    handleProcessExit(code, signal) {
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(new Error(`Python process exited with code ${code} and signal ${signal}`));
        }
        this.pendingRequests.clear();
        this.isInitialized = false;

        // Don't auto-restart to prevent infinite loops
        // The app should handle this more gracefully
        console.error('Python process failed to start. Please check the Python environment.');
    }

    /**
     * Send a request to the Python process
     */
    async request(endpoint, payload = {}, timeoutMs = 30000) {
        if (!this.isInitialized || !this.pythonProcess) {
            throw new Error('IPC Bridge not initialized');
        }

        return new Promise((resolve, reject) => {
            const id = uuidv4();

            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timeout for endpoint: ${endpoint}`));
            }, timeoutMs);

            // Store the pending request
            this.pendingRequests.set(id, { resolve, reject, timeout });

            // Send the request
            const request = JSON.stringify({ id, endpoint, payload }) + '\n';
            this.pythonProcess.stdin.write(request, (error) => {
                if (error) {
                    this.pendingRequests.delete(id);
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        });
    }

    /**
     * Clear existing handlers
     */
    clearHandlers() {
        // Remove all handlers to prevent duplicates
        ipcMain.removeHandler('ipc-request');
        ipcMain.removeHandler('project:getTree');
        ipcMain.removeHandler('project:getFiles');
        ipcMain.removeHandler('project:calculateTokens');
        ipcMain.removeHandler('project:updateItem');
        ipcMain.removeHandler('project:search');
        ipcMain.removeHandler('autoselect:process');
        ipcMain.removeHandler('autoselect:clarify');
        ipcMain.removeHandler('exclusion:list');
        ipcMain.removeHandler('exclusion:save');
        ipcMain.removeHandler('prompt:refine');
        ipcMain.removeHandler('prompt:generate');
        ipcMain.removeHandler('metaprompt:list');
        ipcMain.removeHandler('metaprompt:load');
        ipcMain.removeHandler('metaprompt:save');
        ipcMain.removeHandler('metaprompt:delete');
        ipcMain.removeHandler('kanban:list');
        ipcMain.removeHandler('kanban:create');
        ipcMain.removeHandler('kanban:update');
        ipcMain.removeHandler('kanban:delete');
        ipcMain.removeHandler('todo:list');
        ipcMain.removeHandler('todo:create');
        ipcMain.removeHandler('todo:update');
        ipcMain.removeHandler('todo:delete');
        ipcMain.removeHandler('todo:toggle');
        ipcMain.removeHandler('actor:list');
        ipcMain.removeHandler('actor:create');
        ipcMain.removeHandler('actor:update');
        ipcMain.removeHandler('actor:delete');
        ipcMain.removeHandler('userstory:list');
        ipcMain.removeHandler('userstory:create');
        ipcMain.removeHandler('userstory:update');
        ipcMain.removeHandler('userstory:delete');
        ipcMain.removeHandler('embeddings:generate');
        ipcMain.removeHandler('embeddings:query');
        ipcMain.removeHandler('upload:process');
        ipcMain.removeHandler('token:count');
        ipcMain.removeHandler('export:project');
    }

    /**
     * Register Electron IPC handlers
     */
    registerHandlers() {
        // Generic IPC handler
        ipcMain.handle('ipc-request', async (event, endpoint, payload) => {
            try {
                const result = await this.request(endpoint, payload);
                return { success: true, data: result };
            } catch (error) {
                console.error(`IPC request failed for ${endpoint}:`, error);
                return { success: false, error: error.message };
            }
        });

        // Project-specific handlers
        ipcMain.handle('project:getTree', (event, rootDir) => 
            this.request('project/get_tree', { root_dir: rootDir }));

        ipcMain.handle('project:getFiles', (event, rootDir, files) =>
            this.request('project/get_files', { root_dir: rootDir, files }));

        ipcMain.handle('project:calculateTokens', (event, rootDir, files) =>
            this.request('project/calculate_tokens', { root_dir: rootDir, files }));

        ipcMain.handle('project:updateItem', (event, rootDir, path, updates) =>
            this.request('project/update_item', { root_dir: rootDir, path, updates }));

        ipcMain.handle('project:search', (event, rootDir, query) =>
            this.request('project/search', { root_dir: rootDir, query }));

        // AutoSelect handlers
        ipcMain.handle('autoselect:process', (event, prompt, rootDir, settings) =>
            this.request('autoselect/process', { prompt, root_dir: rootDir, settings }));

        ipcMain.handle('autoselect:clarify', (event, prompt, rootDir, currentFiles, clarification) =>
            this.request('autoselect/clarify', { prompt, root_dir: rootDir, current_files: currentFiles, clarification }));

        // Exclusion handlers
        ipcMain.handle('exclusion:list', (event, rootDir) =>
            this.request('exclusion/list', { root_dir: rootDir }));

        ipcMain.handle('exclusion:save', (event, rootDir, exclusions) =>
            this.request('exclusion/save', { root_dir: rootDir, exclusions }));

        // Prompt handlers
        ipcMain.handle('prompt:refine', (event, rawPrompt, context) =>
            this.request('prompt/refine', { raw_prompt: rawPrompt, context }));

        ipcMain.handle('prompt:generate', (event, rootDir, files, userPrompt, options) =>
            this.request('prompt/generate', { 
                root_dir: rootDir, 
                files, 
                user_prompt: userPrompt,
                include_line_numbers: options.includeLineNumbers || false,
                line_number_format: options.lineNumberFormat || '',
                file_reference_format: options.fileReferenceFormat || '',
                ai_provider: options.aiProvider || 'anthropic',
                format: options.format || 'markdown'
            }));

        // MetaPrompt handlers
        ipcMain.handle('metaprompt:list', () =>
            this.request('metaprompt/list', {}));

        ipcMain.handle('metaprompt:load', (event, filename) =>
            this.request('metaprompt/load', { filename }));

        ipcMain.handle('metaprompt:save', (event, filename, content) =>
            this.request('metaprompt/save', { filename, content }));

        ipcMain.handle('metaprompt:delete', (event, filename) =>
            this.request('metaprompt/delete', { filename }));

        // Kanban handlers
        ipcMain.handle('kanban:list', (event, projectPath) =>
            this.request('kanban/list', { project_path: projectPath }));

        ipcMain.handle('kanban:create', (event, projectPath, itemData) =>
            this.request('kanban/create', { project_path: projectPath, item_data: itemData }));

        ipcMain.handle('kanban:update', (event, projectPath, itemId, updates) =>
            this.request('kanban/update', { project_path: projectPath, item_id: itemId, updates }));

        ipcMain.handle('kanban:delete', (event, projectPath, itemId) =>
            this.request('kanban/delete', { project_path: projectPath, item_id: itemId }));

        // Todo handlers
        ipcMain.handle('todo:list', (event, rootDir) =>
            this.request('todo/list', { root_dir: rootDir }));

        ipcMain.handle('todo:create', (event, rootDir, todo) =>
            this.request('todo/create', { root_dir: rootDir, todo }));

        ipcMain.handle('todo:update', (event, rootDir, todoId, updates) =>
            this.request('todo/update', { root_dir: rootDir, todo_id: todoId, updates }));

        ipcMain.handle('todo:delete', (event, rootDir, todoId) =>
            this.request('todo/delete', { root_dir: rootDir, todo_id: todoId }));

        ipcMain.handle('todo:toggle', (event, rootDir, todoId) =>
            this.request('todo/toggle', { root_dir: rootDir, todo_id: todoId }));

        // Actor handlers
        ipcMain.handle('actor:list', (event, rootDir) =>
            this.request('actor/list', { root_dir: rootDir }));

        ipcMain.handle('actor:create', (event, rootDir, actor) =>
            this.request('actor/create', { root_dir: rootDir, actor }));

        ipcMain.handle('actor:update', (event, rootDir, actorId, updates) =>
            this.request('actor/update', { root_dir: rootDir, actor_id: actorId, updates }));

        ipcMain.handle('actor:delete', (event, rootDir, actorId) =>
            this.request('actor/delete', { root_dir: rootDir, actor_id: actorId }));

        // User Story handlers
        ipcMain.handle('userstory:list', (event, rootDir) =>
            this.request('userstory/list', { root_dir: rootDir }));

        ipcMain.handle('userstory:create', (event, rootDir, story) =>
            this.request('userstory/create', { root_dir: rootDir, story }));

        ipcMain.handle('userstory:update', (event, rootDir, storyId, updates) =>
            this.request('userstory/update', { root_dir: rootDir, story_id: storyId, updates }));

        ipcMain.handle('userstory:delete', (event, rootDir, storyId) =>
            this.request('userstory/delete', { root_dir: rootDir, story_id: storyId }));

        // Embeddings handlers
        ipcMain.handle('embeddings:generate', (event, rootDir, files) =>
            this.request('embeddings/generate', { root_dir: rootDir, files }));

        ipcMain.handle('embeddings:query', (event, rootDir, query, topK) =>
            this.request('embeddings/query', { root_dir: rootDir, query, top_k: topK }));

        // File upload handlers
        ipcMain.handle('upload:process', (event, filePath, originalName) =>
            this.request('upload/process', { file_path: filePath, original_name: originalName }));

        // Token handlers
        ipcMain.handle('token:count', (event, text, model) =>
            this.request('token/count', { text, model }));

        // Export handlers
        ipcMain.handle('export:project', (event, rootDir, exportFormat, includeFiles, options) =>
            this.request('export/project', { 
                root_dir: rootDir, 
                export_format: exportFormat, 
                include_files: includeFiles, 
                options 
            }));
    }

    /**
     * Shutdown the IPC bridge
     */
    async shutdown() {
        this.clearHandlers();
        
        if (this.pythonProcess) {
            // Give Python process time to clean up
            this.pythonProcess.stdin.end();
            
            // Wait a bit for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Force kill if still running
            if (!this.pythonProcess.killed) {
                this.pythonProcess.kill();
            }
            
            this.pythonProcess = null;
            this.isInitialized = false;
        }
    }
}

module.exports = IPCBridge;