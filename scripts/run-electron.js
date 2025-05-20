#!/usr/bin/env node
/**
 * Starts Electron safely in every environment:
 *   • Local dev with a DISPLAY        → run Electron directly.
 *   • CI / HEADLESS / SKIP_ELECTRON   → skip Electron, keep process alive.
 *   • Head-less with Xvfb available   → start Xvfb, then run Electron.
 *
 * If Electron is skipped, the Flask backend and Next.js frontend stay up,
 * which is exactly what automated tests need.
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');

/* ------------------------------------------------------------------ */
/* Helper utilities                                                   */
/* ------------------------------------------------------------------ */

function keepProcessAlive() {
  /* 24 h interval keeps Node alive while consuming virtually no CPU. */
  setInterval(() => {}, 24 * 60 * 60 * 1000);
}

function spawnElectron() {
  const child = spawn(
    'electron',
    ['--no-sandbox', path.resolve('.')], // cwd = project root
    { stdio: 'inherit' }
  );

  /* Propagate Electron’s exit status so CI fails when the app crashes. */
  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });

  return child;
}

function truthy(v) {
  return ['1', 'true', 'yes'].includes(String(v).toLowerCase());
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

function main() {
  /* 1️⃣  CI / head-less detection ---------------------------------- */
  const isHeadless =
    truthy(process.env.CI) ||
    truthy(process.env.HEADLESS) ||
    truthy(process.env.SKIP_ELECTRON);

  if (isHeadless) {
    console.log('[run-electron] CI / head-less mode – skipping Electron UI.');
    keepProcessAlive();
    return;
  }

  /* 2️⃣  DISPLAY already present → start Electron directly --------- */
  if (process.env.DISPLAY) {
    spawnElectron();
    return;
  }

  /* 3️⃣  Try to spin up Xvfb for a virtual display ------------------ */
  let xvfb;
  try {
    const Xvfb = require('xvfb');                                // dev-dep
    xvfb = new Xvfb({ silent: true, xvfb_args: ['-screen', '0', '1280x720x24'] });
    xvfb.startSync();
    console.log('[run-electron] Xvfb virtual display started.');
  } catch (err) {
    console.warn(
      '[run-electron] Xvfb unavailable – running without Electron UI. ' +
        'Backend & frontend servers will stay alive for tests.\n',
      err
    );
    keepProcessAlive();
    return;
  }

  /* 4️⃣  Launch Electron inside the virtual display ----------------- */
  const electronProc = spawnElectron();

  /* 5️⃣  Graceful shutdown ----------------------------------------- */
  function shutdown() {
    try {
      xvfb?.stopSync();
    } catch {
      /* ignore */
    }
    process.exit();
  }

  process.on('SIGINT',  () => { electronProc.kill('SIGINT');  shutdown(); });
  process.on('SIGTERM', () => { electronProc.kill('SIGTERM'); shutdown(); });
  electronProc.on('exit', shutdown);
}

main();
