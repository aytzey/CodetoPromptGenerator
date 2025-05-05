const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

let backend = null;
const BACKEND_PORT = '5010';

function findPython() {
  for (const cmd of ['python3', 'python', 'py']) {
    const r = spawnSync(cmd, ['--version']);
    if (!r.error && r.status === 0) return cmd;
  }
  throw new Error('Python interpreter not found. Install python3.');
}

function startBackend(isDev) {
  const root = isDev ? process.cwd() : process.resourcesPath;
  const py = isDev ? findPython()
                   : path.join(root, 'python_backend', 'venv', 'bin', 'python');
  const script = isDev
    ? path.join(root, 'python_backend', 'app.py')
    : path.join(root, 'python_backend', 'app.py');

  backend = spawn(py, [script], {
    env: { ...process.env, FLASK_PORT: BACKEND_PORT, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  backend.on('exit', code => console.log(`[backend] exited (${code})`));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { contextIsolation: true },
  });
  const url = app.isPackaged
    ? `file://${path.join(__dirname, '..', 'out', 'index.html')}`
    : 'http://127.0.0.1:3010';
  win.loadURL(url);
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  if (isDev) {
    require('electron-reload')(__dirname, {
      awaitWriteFinish: true,
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    });
  }
  startBackend(isDev);
  createWindow();
});

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
app.on('quit', () => backend && backend.kill('SIGTERM'));
