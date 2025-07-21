#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function startDevServer() {
  try {
    console.log('[dev-server] Starting Next.js development server...');
    
    // Start Next.js dev server
    const nextProcess = spawn('npx', ['next', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });
    
    // Start Python HTTP backend
    const pythonProcess = spawn('python', [
      path.join(__dirname, '..', 'python_backend', 'app_http.py')
    ], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        PORT: '5000'
      }
    });
    
    // Handle cleanup
    const cleanup = () => {
      console.log('[dev-server] Cleaning up...');
      
      if (nextProcess && !nextProcess.killed) {
        nextProcess.kill();
      }
      
      if (pythonProcess && !pythonProcess.killed) {
        pythonProcess.kill();
      }
      
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    nextProcess.on('exit', (code) => {
      console.log(`[dev-server] Next.js exited with code ${code}`);
      cleanup();
    });
    
    pythonProcess.on('exit', (code) => {
      console.log(`[dev-server] Python backend exited with code ${code}`);
      cleanup();
    });
    
  } catch (error) {
    console.error('[dev-server] Error:', error);
    process.exit(1);
  }
}

console.log('[dev-server] Starting development server for testing...');
startDevServer();