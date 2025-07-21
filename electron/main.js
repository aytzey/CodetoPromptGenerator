const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const os = require('node:os'); // Import os module
const IPCBridge = require('./ipcBridge');

let ipcBridge = null;

process.on('uncaughtException', (err) => {
  console.error('[electron] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[electron] Unhandled rejection:', reason);
});


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
        nodeIntegration: false, 
        contextIsolation: true, 
        preload: path.join(__dirname, 'preload.js') 
    },
  });

  // Always use static files (no dev server)
  const frontendUrl = `file://${path.join(__dirname, '..', 'out', 'index.html')}`;
  
  console.log(`[electron] Loading static files from: ${frontendUrl}`);
  
  win.loadURL(frontendUrl)
    .then(() => {
      win.setMenu(null);
      console.log('[electron] Default menu bar removed.');
    })
    .catch(err => {
        console.error(`[electron] Failed to load URL ${frontendUrl}:`, err);
    });

    // Open DevTools in development
    if (!app.isPackaged) {
        win.webContents.openDevTools();
    }
}

app.whenReady().then(async () => {

  // Initialize IPC Bridge instead of REST API backend
  try {
    ipcBridge = new IPCBridge();
    await ipcBridge.initialize();
    console.log('[electron] IPC Bridge initialized successfully');
  } catch (error) {
    console.error('[electron] Failed to initialize IPC Bridge:', error);
    app.quit();
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', async () => {
  console.log('[electron] Quitting application.');
  
  // Shutdown IPC Bridge
  if (ipcBridge) {
    console.log('[electron] Shutting down IPC Bridge...');
    await ipcBridge.shutdown();
  }
  
});