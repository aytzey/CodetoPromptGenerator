#!/usr/bin/env node
/**
 * scripts/run-electron.js
 *
 * Starts Electron in the safest way for all environments:
 *   • If a DISPLAY server exists → run Electron directly.
 *   • Otherwise → spin up a lightweight, in-memory Xvfb instance, then run Electron.
 *
 * The Xvfb server is shut down automatically on exit / SIGINT / SIGTERM.
 */

const { spawn } = require('child_process');
const path = require('path');

function spawnElectron() {
  const electronProc = spawn(
    'electron',
    ['--no-sandbox', path.resolve('.')], // cwd
    { stdio: 'inherit' }
  );

  // Ensure this wrapper exits with the same status as Electron
  electronProc.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });

  return electronProc;
}

// 1️⃣ Already have a display?  Great – no Xvfb needed.
if (process.env.DISPLAY) {
  spawnElectron();
  return;
}

// 2️⃣ Head-less → start an embedded Xvfb.
let xvfb;
try {
  const Xvfb = require('xvfb'); // installed via devDependencies
  xvfb = new Xvfb({ silent: true, xvfb_args: ['-screen', '0', '1280x720x24'] });
  xvfb.startSync();
  console.log('[run-electron] Started Xvfb for head-less environment.');
} catch (err) {
  console.error('[run-electron] Failed to start Xvfb automatically.\n' +
                'Install a system X11 server or ensure the "xvfb" npm package is present.', err);
  process.exit(1);
}

// 3️⃣ Run Electron inside the virtual display.
const electronProc = spawnElectron();

// 4️⃣ Clean-up handlers.
function shutdown() {
  try { xvfb?.stopSync(); } catch {/* ignore */ }
  process.exit();
}

process.on('SIGINT',  () => { electronProc.kill('SIGINT');  shutdown(); });
process.on('SIGTERM', () => { electronProc.kill('SIGTERM'); shutdown(); });
electronProc.on('exit', shutdown);
