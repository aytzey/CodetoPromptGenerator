#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// No HTTP adapter, no TCP ports - just pure Electron with IPC
async function startElectron() {
  try {
    // Check if the static build exists
    const outDir = path.join(__dirname, '..', 'out');
    if (!fs.existsSync(outDir) || !fs.existsSync(path.join(outDir, 'index.html'))) {
      console.log('[launcher] Static build not found. Building Next.js app...');
      
      // Build the Next.js app first
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        shell: true
      });
      
      await new Promise((resolve, reject) => {
        buildProcess.on('exit', (code) => {
          if (code === 0) {
            console.log('[launcher] Build completed successfully');
            resolve();
          } else {
            reject(new Error(`Build failed with code ${code}`));
          }
        });
      });
    }
    
    // Start Electron with the built static files
    const electronPath = require('electron');
    const electronProcess = spawn(electronPath, ['.'], {
      stdio: 'inherit',
      env: { 
        ...process.env, 
        APP_ENV: 'production', // Force production mode to use static files
        ELECTRON_IS_DEV: '0'
      }
    });
    
    // Handle cleanup
    const cleanup = () => {
      console.log('[launcher] Cleaning up...');
      
      if (electronProcess && !electronProcess.killed) {
        electronProcess.kill();
      }
      
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
    
    electronProcess.on('exit', (code) => {
      console.log(`[launcher] Electron exited with code ${code}`);
      process.exit(code);
    });
    
  } catch (error) {
    console.error('[launcher] Error:', error);
    process.exit(1);
  }
}

console.log('[launcher] Starting Electron with pure IPC (no TCP/HTTP)...');
startElectron();