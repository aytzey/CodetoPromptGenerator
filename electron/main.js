const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const os = require('node:os'); // Import os module

let backendProcess = null; // Renamed to avoid conflict with backend variable name if used elsewhere
const BACKEND_PORT = '5010';

process.on('uncaughtException', (err) => {
  console.error('[electron] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[electron] Unhandled rejection:', reason);
});

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
  return null;
}

function startBackend(isPackagedApp) {
  if (!isPackagedApp) {
      console.log("[electron] Skipping backend start in non-packaged mode (handled by npm script).");
      return;
  }

  const rootDir = process.resourcesPath; // In packaged app, resourcesPath is the base
  const pythonBackendDir = path.join(rootDir, 'python_backend');
  const pythonExecutable = path.join(pythonBackendDir, 'venv', os.platform() === 'win32' ? 'Scripts' : 'bin', 'python');
  const backendAppModule = 'app:app'; // For Gunicorn: refers to app.py and the 'app' instance

  console.log(`[electron] Preparing to start backend for packaged app.`);

  if (!require('fs').existsSync(pythonExecutable)) {
      console.error(`[electron] ERROR: Packaged Python interpreter not found at ${pythonExecutable}`);
      return;
  }
   // Check for app.py (not strictly needed for Gunicorn module path, but good sanity check)
   if (!require('fs').existsSync(path.join(pythonBackendDir, 'app.py'))) {
      console.error(`[electron] ERROR: Packaged backend app.py script not found in ${pythonBackendDir}`);
      return;
  }

  // Use Gunicorn to run the Flask app in production
  const gunicornArgs = [
    '-m', 'gunicorn', // Run gunicorn as a module
    '-w', '2',        // Number of worker processes (adjust as needed)
    '-b', `127.0.0.1:${BACKEND_PORT}`, // Bind address and port
    backendAppModule  // WSGI application (app:app means app.py, app instance)
  ];

  console.log(`[electron] Starting Gunicorn: ${pythonExecutable} ${gunicornArgs.join(' ')} in ${pythonBackendDir}`);

  backendProcess = spawn(pythonExecutable, gunicornArgs, {
    cwd: pythonBackendDir, // Set working directory for Gunicorn to python_backend
    env: { ...process.env, PYTHONUNBUFFERED: '1' }, // Ensure Python output is unbuffered
    stdio: ['ignore', 'pipe', 'pipe'], 
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log(`[gunicorn-backend] stdout: ${data.toString().trim()}`);
  });
  backendProcess.stderr?.on('data', (data) => {
    // Gunicorn often logs to stderr, so differentiate between actual errors and info
    const logLine = data.toString().trim();
    if (logLine.includes('[ERROR]') || logLine.includes('Traceback')) {
        console.error(`[gunicorn-backend] stderr: ${logLine}`);
    } else {
        console.log(`[gunicorn-backend] log: ${logLine}`);
    }
  });

  backendProcess.on('exit', (code, signal) => {
      console.log(`[gunicorn-backend] exited with code ${code}, signal ${signal}`);
      backendProcess = null; 
  });
   backendProcess.on('error', (err) => {
        console.error('[gunicorn-backend] Failed to start Gunicorn subprocess.', err);
        backendProcess = null;
   });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
        nodeIntegration: false, 
        contextIsolation: true, 
        // preload: path.join(__dirname, 'preload.js') 
    },
  });

  // Determine if running in development mode (Next.js dev server)
  // or production-like mode (packaged app or local prod build)
  const isDevelopmentEnv = process.env.APP_ENV !== 'production' && !app.isPackaged;

  const frontendUrl = isDevelopmentEnv
    ? 'http://127.0.0.1:3010' // Dev server URL from `npm run dev`
    : `file://${path.join(__dirname, '..', 'out', 'index.html')}`; // Packaged app or local prod build

  console.log(`[electron] Loading URL for ${isDevelopmentEnv ? 'DEV (Next.js dev server)' : 'PROD (static files)'}: ${frontendUrl}`);
  
  win.loadURL(frontendUrl)
    .then(() => {
      win.setMenu(null);
      console.log('[electron] Default menu bar removed.');
    })
    .catch(err => {
        console.error(`[electron] Failed to load URL ${frontendUrl}:`, err);
    });

    if (isDevelopmentEnv || process.env.APP_ENV === 'production_devtools') { // Allow devtools in local prod build if needed
        win.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
  const isPackaged = app.isPackaged;
  const isDevScript = process.env.npm_lifecycle_event === 'electron:dev';


  if (!isPackaged && isDevScript) { // Only enable electron-reload for `npm run electron:dev`
    const reloadEnabled = /^(1|true)$/i.test(process.env.USE_ELECTRON_RELOAD || '');
    if (reloadEnabled) {
      try {
        require('electron-reload')(__dirname, {
          electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
          awaitWriteFinish: true,
        });
        console.log('[electron] Fast reload enabled for electron:dev.');
      } catch (err) {
        console.warn('[electron] electron-reload setup failed:', err.message);
      }
    } else {
      console.log('[electron] Fast reload disabled for electron:dev.');
    }
  }

  if (isPackaged) { // Start backend only if packaged
    startBackend(true); 
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

app.on('quit', () => {
  console.log('[electron] Quitting application.');
  if (backendProcess) {
    console.log('[electron] Terminating backend process...');
    backendProcess.kill('SIGTERM'); 
     setTimeout(() => {
         if (backendProcess && !backendProcess.killed) {
             console.warn('[electron] Backend process did not terminate gracefully, sending SIGKILL.');
             backendProcess.kill('SIGKILL');
         }
     }, 3000); 
  }
});