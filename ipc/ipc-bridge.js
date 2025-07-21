const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

class IPCBridge extends EventEmitter {
  constructor() {
    super();
    this.backendProcess = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.buffer = '';
  }

  async start() {
    const pythonCmd = process.platform === 'win32' 
      ? 'python_backend\\venv\\Scripts\\python' 
      : 'python_backend/venv/bin/python';
    
    const scriptPath = path.join(__dirname, '..', 'python_backend', 'ipc_wrapper.py');
    
    this.backendProcess = spawn(pythonCmd, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    this.backendProcess.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.backendProcess.stderr.on('data', (data) => {
      console.error('[IPC] Backend error:', data.toString());
    });

    this.backendProcess.on('error', (error) => {
      console.error('[IPC] Failed to start backend:', error);
      this.emit('error', error);
    });

    this.backendProcess.on('exit', (code) => {
      console.log(`[IPC] Backend exited with code ${code}`);
      this.emit('exit', code);
    });

    // Wait for ready signal
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Backend startup timeout'));
      }, 10000);

      this.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line);
        
        if (message.type === 'ready') {
          this.emit('ready');
        } else if (message.type === 'response') {
          const pending = this.pendingRequests.get(message.id);
          if (pending) {
            this.pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error));
            } else {
              pending.resolve(message.result);
            }
          }
        } else if (message.type === 'event') {
          this.emit('backend-event', message.data);
        }
      } catch (error) {
        console.error('[IPC] Failed to parse message:', line, error);
      }
    }
  }

  async request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      
      this.pendingRequests.set(id, { resolve, reject });
      
      const message = JSON.stringify({
        id,
        method,
        params
      }) + '\n';
      
      this.backendProcess.stdin.write(message, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  stop() {
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.backendProcess && !this.backendProcess.killed) {
          this.backendProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

module.exports = IPCBridge;