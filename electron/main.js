const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const os = require('node:os'); // Import os module

let backendProcess = null; // Renamed to avoid conflict with backend variable name if used elsewhere
const BACKEND_PORT = '5010';

function findPython() {
  for (const cmd of ['python3', 'python', 'py']) {
    try {
      const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 1000 });
      if (!r.error && r.status === 0) {
        console.log(`[electron] Found Python: ${cmd} (${r.stdout.trim() || r.stderr.trim()})`);
        return cmd;
      }
    } catch (err) {
      // Ignore errors (e.g., command not found) and try the next candidate
      console.debug(`[electron] Python command '${cmd}' failed or not found.`);
    }
  }
  console.error('[electron] ERROR: Python interpreter not found. Please install Python 3.');
  // Optional: Exit or throw if Python is absolutely required even for dev setup aspects not involving the direct backend start
  // For now, we allow Electron to start, assuming the external backend process handles Python needs in dev.
  // throw new Error('Python interpreter not found. Install python3.');
  return null; // Return null if no python found
}

function startBackend(isDevMode) {
  // This function should only be called when isDevMode is false (i.e., packaged app)
  if (isDevMode) {
      console.log("[electron] Skipping backend start in dev mode (handled by npm script).");
      return;
  }

  const rootDir = process.resourcesPath; // In packaged app, resourcesPath is the base
  const pythonExecutable = path.join(rootDir, 'python_backend', 'venv', os.platform() === 'win32' ? 'Scripts' : 'bin', 'python');
  const backendScript = path.join(rootDir, 'python_backend', 'app.py');

  console.log(`[electron] Starting backend: ${pythonExecutable} ${backendScript}`);

  // Check if the python executable exists in the packaged resources
  if (!require('fs').existsSync(pythonExecutable)) {
      console.error(`[electron] ERROR: Packaged Python interpreter not found at ${pythonExecutable}`);
      // Handle this error appropriately - maybe show an error dialog to the user
      return;
  }
   if (!require('fs').existsSync(backendScript)) {
      console.error(`[electron] ERROR: Packaged backend script not found at ${backendScript}`);
      return;
  }

  backendProcess = spawn(pythonExecutable, [backendScript], {
    // Ensure necessary environment variables are set if needed for the packaged app
    env: { ...process.env, FLASK_PORT: BACKEND_PORT, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'], // Pipe output for logging
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[backend-pkg] stdout: ${data.toString().trim()}`);
  });
  backendProcess.stderr?.on('data', (data) => {
    console.error(`[backend-pkg] stderr: ${data.toString().trim()}`);
  });

  backendProcess.on('exit', (code, signal) => {
      console.log(`[backend-pkg] exited with code ${code}, signal ${signal}`);
      backendProcess = null; // Clear the reference
  });
   backendProcess.on('error', (err) => {
        console.error('[backend-pkg] Failed to start subprocess.', err);
        backendProcess = null;
   });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
        nodeIntegration: false, // Best practice: disable nodeIntegration
        contextIsolation: true, // Best practice: enable contextIsolation
        // preload: path.join(__dirname, 'preload.js') // Consider using a preload script if needed
    },
    // Optionally, hide menu bar on Windows/Linux (user can press Alt to show)
    // autoHideMenuBar: true, // This hides but doesn't remove it
  });

  const isDev = !app.isPackaged;
  const frontendUrl = isDev
    ? 'http://127.0.0.1:3010' // Dev server URL
    : `file://${path.join(__dirname, '..', 'out', 'index.html')}`; // Packaged app URL

  console.log(`[electron] Loading URL: ${frontendUrl}`);
  win.loadURL(frontendUrl)
    .then(() => {
      // Completely remove the menu bar after the window loads
      win.setMenu(null);
      console.log('[electron] Default menu bar removed.');
    })
    .catch(err => {
        console.error(`[electron] Failed to load URL ${frontendUrl}:`, err);
        // Potentially load an error page or quit
    });

    // Open DevTools in development
    if (isDev) {
        win.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  if (isDev) {
    // Setup electron-reload only in development
    try {
        require('electron-reload')(__dirname, {
            electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
            awaitWriteFinish: true, // Wait for file writes to complete
        });
        console.log("[electron] electron-reload enabled.");
    } catch (err) {
        console.warn("[electron] electron-reload setup failed (likely not installed, which is ok for basic runs):", err.message);
    }
  }

  // Start the backend process *only* when the app is packaged.
  // In development, the backend is started separately by the npm script.
  if (!isDev) {
    startBackend(false); // Pass false indicating it's not dev mode
  }

  createWindow();

  // Handle macOS activation
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure backend process is terminated when Electron quits
app.on('quit', () => {
  console.log('[electron] Quitting application.');
  if (backendProcess) {
    console.log('[electron] Terminating backend process...');
    backendProcess.kill('SIGTERM'); // Send SIGTERM first
     setTimeout(() => {
         if (backendProcess && !backendProcess.killed) {
             console.warn('[electron] Backend process did not terminate gracefully, sending SIGKILL.');
             backendProcess.kill('SIGKILL');
         }
     }, 3000); // Force kill after 3 seconds if needed
  }
});