// scripts/autotest.js

/**
 * AutoTest Script (Reads ports from ports.ini).
 * ---------------------------------------------------
 * This script performs checks on the Python backend (Flask) and
 * the Next.js frontend to ensure they satisfy project requirements.
 *
 * FIX (2025-04-19): Corrected assertion logic in the POST /api/projects/files test.
 *                   It now checks for the specific error message prefix instead of
 *                   just the substring "File not found" within the actual file content.
 */
const fs = require('fs');
const path = require('path');
const { EOL } = require('os');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const killPort = require('kill-port');

// --- Helper Functions --- (Copied from start.js)
function parseIni(iniContent) { /* ... same as before ... */ }
function getPortConfig() { /* ... same as before ... */ }
// --- End Helper Functions ---

// --- Main Test Logic ---
(async () => {
  const { default: fetch } = await import('node-fetch');

  // Get port configuration
  const { frontendPort, backendPort, backendUrl } = getPortConfig();
  const FRONTEND_BASE_URL = `http://localhost:${frontendPort}`;
  const BACKEND_BASE_URL = backendUrl; // Use the constructed URL

  // Ensure ports are free before starting
  try {
    await killPort(backendPort);
  } catch {
    /* ignore */
  }
  try {
    await killPort(frontendPort);
  } catch {
    /* ignore */
  }

  // Start backend and frontend if not already running
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const processes = [];
  function startProc(cmd, args, name) {
    const child = spawn(cmd, args, { stdio: 'inherit', detached: true });
    child.on('error', err => console.error(`Failed to start ${name}:`, err));
    processes.push(child);
  }
  function cleanup() {
    for (const p of processes) {
      try { process.kill(-p.pid); } catch { /* ignore */ }
    }
  }
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  startProc(npmCmd, ['run', 'backend'], 'backend');
  startProc(npmCmd, ['run', 'dev'], 'frontend');

  await waitOn({ resources: [`tcp:127.0.0.1:${backendPort}`, `tcp:127.0.0.1:${frontendPort}`], timeout: 60000 });

  // Simple color utilities
  const green = str => `\x1b[32m${str}\x1b[0m`;
  const red = str => `\x1b[31m${str}\x1b[0m`;

  let passed = 0;
  let failed = 0;

  async function runTest(testName, testFn) {
    try {
      await testFn();
      console.log(green(`[PASS] ${testName}`));
      passed++;
    } catch (err) {
      console.error(red(`[FAIL] ${testName} => ${err.message}`));
      failed++;
    }
  }

  console.log(`Starting AutoTest for Next.js (${FRONTEND_BASE_URL}) + Python backend (${BACKEND_BASE_URL})...\n`);

  // --- Health Check ---
  await runTest("Backend: GET /health returns healthy status", async () => {
    const resp = await fetch(`${BACKEND_BASE_URL}/health`); // Use dynamic URL
    if (!resp.ok) throw new Error(`Expected HTTP 200 but got ${resp.status}`);
    const data = await resp.json();
    if (!data.status || data.status !== "healthy") throw new Error("Expected { status: 'healthy' } in response");
  });

  // --- TODO Endpoints ---
  await runTest("Backend: GET /api/todos returns array with success=true", async () => {
    const resp = await fetch(`${BACKEND_BASE_URL}/api/todos`); // Use dynamic URL
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data)) throw new Error("Expected data to be an array");
  });

  await runTest("Backend: POST /api/todos can create new todo", async () => {
    const resp = await fetch(`${BACKEND_BASE_URL}/api/todos`, { // Use dynamic URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "auto-test item" }),
    });
    if (!resp.ok) throw new Error(`Expected HTTP 201 but got ${resp.status}`); // Expect 201 Created
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!data.data || !data.data.id) throw new Error("Expected new todo with an 'id'");
  });

  await runTest("Backend: POST /api/todos with empty text yields 400", async () => {
    const resp = await fetch(`${BACKEND_BASE_URL}/api/todos`, { // Use dynamic URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    if (resp.status !== 400) throw new Error("Expected HTTP 400");
  });

  await runTest("Backend: DELETE /api/todos/:id removes the specified todo", async () => {
    // First create a new todo
    const newResp = await fetch(`${BACKEND_BASE_URL}/api/todos`, { // Use dynamic URL
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "delete-me" }),
    });
    const newData = await newResp.json();
    if (!newData.success || !newData.data?.id) throw new Error("Failed to create a todo for deletion test");
    const todoId = newData.data.id;

    // Now delete it
    const deleteResp = await fetch(`${BACKEND_BASE_URL}/api/todos/${todoId}`, { method: "DELETE" }); // Use dynamic URL
    if (deleteResp.status !== 204) throw new Error(`Expected HTTP 204 but got ${deleteResp.status}`); // Expect 204 No Content
    // No JSON body expected for 204
  });


  // --- Project Endpoints ---
   await runTest("Backend: GET /api/projects/tree errors if rootDir is missing", async () => {
    const resp = await fetch(`${BACKEND_BASE_URL}/api/projects/tree`); // Use dynamic URL
    if (resp.status !== 400) {
      throw new Error("Expected status 400 for missing rootDir. Got " + resp.status);
    }
  });

  await runTest("Backend: GET /api/projects/tree returns valid structure for known directory", async () => {
    // Use project root directory for a more comprehensive test
    const testDir = path.dirname(__dirname); // Project root
    const url = `${BACKEND_BASE_URL}/api/projects/tree?rootDir=${encodeURIComponent(testDir)}`; // Use dynamic URL
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status + " " + await resp.text());
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data)) throw new Error("Expected data to be an array of FileNode objects");
    // Add a basic check for content
    if (data.data.length === 0) throw new Error("Expected non-empty file tree for project root");
  });

   await runTest("Backend: POST /api/projects/files fetches file contents with correct tokenCount", async () => {
    const baseDir = path.dirname(__dirname); // Project root
    const relativePaths = ["scripts/autotest.js"]; // Relative to project root
    const resp = await fetch(`${BACKEND_BASE_URL}/api/projects/files`, { // Use dynamic URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseDir: baseDir, paths: relativePaths }),
    });
     if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status + " " + await resp.text());

    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data) || data.data.length !== 1) throw new Error("Expected data to be an array of length 1");
    const fileItem = data.data[0];
    if (!fileItem.content || fileItem.tokenCount < 1) throw new Error("File content or tokenCount missing/invalid");

    // --- CORRECTED ASSERTION ---
    // Check if the content *starts with* the specific error message, not just includes "File not found"
    const fileNotFoundPrefix = "File not found on server:";
    if (typeof fileItem.content === 'string' && fileItem.content.startsWith(fileNotFoundPrefix)) {
        throw new Error(`Backend reported file not found unexpectedly. Content: "${fileItem.content.substring(0, 100)}..."`);
    }
    // --- END CORRECTION ---
  });

  await runTest("Backend: POST /api/projects/files returns 'File not found' for invalid path", async () => {
    const baseDir = __dirname;
    const resp = await fetch(`${BACKEND_BASE_URL}/api/projects/files`, { // Use dynamic URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseDir, paths: ["non_existent_file_12345.txt"] }),
    });
    if (resp.status !== 404) {
      throw new Error(`Expected HTTP 404 but got ${resp.status}`);
    }

    let data = {};
    try {
      data = await resp.json();
    } catch {
      /* ignore parse errors */
    }

    if (data.success !== false) {
      throw new Error("Expected success=false in response");
    }

    const fileNotFoundPrefix = "File not found on server:";
    const errorMessage = typeof data.error === 'string' ? data.error : String(data.message ?? '');
    if (!errorMessage.startsWith(fileNotFoundPrefix)) {
      throw new Error(`Expected a '${fileNotFoundPrefix}' message, got: "${errorMessage.substring(0, 100)}..."`);
    }
  });

  // --- Frontend Checks ---
   await runTest("Frontend: GET / (index page) returns HTML content", async () => {
    const resp = await fetch(FRONTEND_BASE_URL); // Use dynamic URL
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const text = await resp.text();
    if (!text.includes("<!DOCTYPE html") && !text.includes("<div id=\"__next\">")) {
      throw new Error("Expected Next.js HTML content on the index page");
    }
  });

  await runTest("Frontend: GET /some-invalid-route yields 404", async () => {
    const resp = await fetch(`${FRONTEND_BASE_URL}/some-non-existent-route`); // Use dynamic URL
    // Next.js usually returns 404 for undefined routes in dev and prod
    if (resp.status !== 404) {
      throw new Error("Expected a 404 Not Found status, got " + resp.status);
    }
  });

  await runTest("Frontend: Copy fallback included in bundle", async () => {
    const resp = await fetch(FRONTEND_BASE_URL);
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const html = await resp.text();
    const scriptUrls = [];
    for (const m of html.matchAll(/<script[^>]*src=\"([^\"]+)\"/g)) {
      scriptUrls.push(m[1]);
    }

    let found = false;
    for (const path of scriptUrls) {
      let url;
      try {
        url = new URL(path, FRONTEND_BASE_URL).toString();
      } catch {
        continue; // Skip malformed script URLs
      }

      let jsResp;
      try {
        jsResp = await fetch(url);
      } catch {
        continue;
      }
      if (!jsResp.ok) continue;
      const js = await jsResp.text();
      if (js.includes('execCommand("copy"') || js.includes("execCommand('copy'")) {
        found = true;
        break;
      }
    }
    if (!found) throw new Error("Copy fallback not found in frontend bundle");
  });


  // --- Results ---
  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
  cleanup();
  if (failed > 0) {
    console.error(red("Some tests failed. Check logs above."));
    process.exit(1);
  } else {
    console.log(green("All tests passed successfully!"));
    process.exit(0);
  }
})();

// --- Helper Function Definitions --- (Paste parseIni and getPortConfig here)
function parseIni(iniContent) {
    const config = {};
    let currentSection = null;
    const lines = iniContent.split(EOL); // Use OS-specific EOL

    for (const line of lines) {
        const trimmedLine = line.trim();
        // Ignore comments and empty lines
        if (trimmedLine === '' || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
            continue;
        }
        // Check for section header
        if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
            currentSection = trimmedLine.substring(1, trimmedLine.length - 1).trim();
            config[currentSection] = {};
        } else if (currentSection) {
            // Check for key=value pair
            const eqIndex = trimmedLine.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmedLine.substring(0, eqIndex).trim();
                const value = trimmedLine.substring(eqIndex + 1).trim();
                config[currentSection][key] = value;
            }
        }
    }
    return config;
}

function getPortConfig() {
    const PORTS_INI_PATH = path.join(__dirname,'..', 'ports.ini'); // Relative path from scripts dir
    const defaults = {
        frontendPort: '3010',
        backendPort: '5010',
        protocol: 'http',
        host: '127.0.0.1'
    };
    try {
        if (fs.existsSync(PORTS_INI_PATH)) {
            const iniContent = fs.readFileSync(PORTS_INI_PATH, 'utf-8');
            const config = parseIni(iniContent);

            const frontendPort = config?.Ports?.Frontend || defaults.frontendPort;
            const backendPort = config?.Ports?.Backend || defaults.backendPort;
            const protocol = config?.API?.Protocol || defaults.protocol;
            const host = config?.API?.Host || defaults.host;

            if (isNaN(parseInt(frontendPort)) || isNaN(parseInt(backendPort))) {
                 console.warn(`[ports.ini] Invalid port numbers found in autotest. Using defaults.`);
                 return { ...defaults, backendUrl: `${defaults.protocol}://${defaults.host}:${defaults.backendPort}` };
             }

            const backendUrl = `${protocol}://${host}:${backendPort}`;
            return { frontendPort, backendPort, backendUrl };
        }
    } catch (error) {
        console.error(`[ports.ini] Error reading or parsing ${PORTS_INI_PATH} in autotest:`, error);
    }
    // Return defaults if file doesn't exist or error occurred
    return { ...defaults, backendUrl: `${defaults.protocol}://${defaults.host}:${defaults.backendPort}` };
}
