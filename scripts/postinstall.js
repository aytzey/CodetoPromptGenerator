#!/usr/bin/env node
/**
 * scripts/postinstall.js
 *
 * A cross-platform script that attempts to:
 *   1) Locate a working "python" interpreter (python3, python, or py).
 *   2) Create/upgrade a virtual environment under python_backend/venv.
 *   3) Install packages from python_backend/requirements.txt.
 *
 * If Python is not found, or anything fails, it will print an error but continue.
 * You can modify to `process.exit(1)` if you want a hard failure.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 1) Attempt to find a suitable Python command.
function findPythonCommand() {
  const candidates = os.platform() === 'win32'
    ? ['py', 'python', 'python3']
    : ['python3', 'python'];

  for (const cmd of candidates) {
    const result = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (result.status === 0 && !result.error) {
      return cmd;
    }
  }
  return null;
}

const pythonCmd = findPythonCommand();
if (!pythonCmd) {
  console.warn(`
[postinstall] WARNING: Could not find a working Python interpreter.
[postinstall] Skipping virtual environment creation and Python deps install.
`);
  process.exit(0); // or `process.exit(1)` if you want to fail hard
}

// 2) Create or upgrade the venv inside python_backend/venv
const backendDir = path.join(__dirname, '..', 'python_backend');
const venvDir = path.join(backendDir, 'venv');

// Check if venv directory exists
if (!fs.existsSync(venvDir)) {
  console.log(`[postinstall] Creating virtual environment with "${pythonCmd}"...`);
  const venvResult = spawnSync(pythonCmd, ['-m', 'venv', 'venv'], {
    cwd: backendDir,
    stdio: 'inherit',
  });
  if (venvResult.status !== 0) {
    console.error('[postinstall] ERROR: Failed to create virtual environment.');
    process.exit(0); // or `process.exit(1)`
  }
} else {
  console.log('[postinstall] Virtual environment already exists. Skipping creation.');
}

// 3) Install the Python dependencies from requirements.txt inside the venv
// We need to call the pip inside the venv. 
// On Windows: venv\\Scripts\\pip.exe
// On Mac/Linux: venv/bin/pip
let pipPath = '';
if (os.platform() === 'win32') {
  pipPath = path.join(venvDir, 'Scripts', 'pip.exe');
} else {
  pipPath = path.join(venvDir, 'bin', 'pip');
}

// If pip doesn't exist yet, fallback to: python -m pip ...
if (!fs.existsSync(pipPath)) {
  console.log('[postinstall] pip not found in venv; trying python -m pip...');
  pipPath = pythonCmd;
}

const reqFile = path.join(backendDir, 'requirements.txt');
if (!fs.existsSync(reqFile)) {
  console.warn('[postinstall] No requirements.txt found, skipping pip install.');
  process.exit(0);
}

console.log('[postinstall] Installing Python dependencies from requirements.txt...');
const pipResult = spawnSync(
  pipPath,
  pipPath === pythonCmd
    ? ['-m', 'pip', 'install', '-r', 'requirements.txt']
    : ['install', '-r', 'requirements.txt'],
  {
    cwd: backendDir,
    stdio: 'inherit',
  }
);

if (pipResult.status !== 0) {
  console.error('[postinstall] ERROR: Failed to install Python dependencies.');
  process.exit(0); // or `process.exit(1)`
}

console.log('[postinstall] Python dependencies installed successfully!');
process.exit(0);
