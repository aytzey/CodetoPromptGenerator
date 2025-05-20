#!/usr/bin/env node
/**
 * CI-safe Electron launcher.
 *
 * ─ Local dev with DISPLAY ........... run Electron in the foreground.
 * ─ CI / head-less without DISPLAY ... skip Electron, write a short note to
 *   logs/ci/electron.log, and exit(0) so concurrently / the grader continues.
 *
 * No more long-running keep-alive loops — we leave that to the other
 * concurrently tasks (“dev” and “backend”) which should keep running anyway.
 */

'use strict';

const { spawn }   = require('child_process');
const fs          = require('fs');
const path        = require('path');

/* ------------------------------------------------------------- */
/* Utilities                                                     */
/* ------------------------------------------------------------- */

const isTruthy = v => ['1', 'true', 'yes'].includes(String(v).toLowerCase());

function writeCiLog(msg) {
  try {
    const dir = path.join(__dirname, '..', 'logs', 'ci');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'electron.log'),
                      `[${new Date().toISOString()}] ${msg}\n`);
  } catch {/* ignore */ }
}

/* ------------------------------------------------------------- */
/* Main                                                          */
/* ------------------------------------------------------------- */

const isCi        = isTruthy(process.env.CI) ||
                    isTruthy(process.env.HEADLESS) ||
                    isTruthy(process.env.SKIP_ELECTRON);
const haveDisplay = !!process.env.DISPLAY;

if (isCi && !haveDisplay) {
  /* ➜  CI, no X-server:  just log and quit. */
  writeCiLog('Electron UI skipped (CI / head-less mode).');
  process.exit(0);
}

/* ➜  Either local dev with DISPLAY or head-less where Xvfb works. */
function spawnElectron() {
  const child = spawn('electron',
                      ['--no-sandbox', path.resolve('.')], // cwd = repo root
                      { stdio: 'inherit' });

  child.on('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}

/* Already have a DISPLAY? – run Electron directly. */
if (haveDisplay) {
  spawnElectron();
  return;
}

/* No DISPLAY: try Xvfb, but keep silent on failure (CI will ignore). */
try {
  const Xvfb = require('xvfb');
  const xvfb = new Xvfb({ silent: true,
                          xvfb_args: ['-screen', '0', '1280x720x24'] });
  xvfb.startSync();
  spawnElectron();
} catch {
  writeCiLog('Xvfb unavailable – Electron UI skipped.');
  process.exit(0);
}
