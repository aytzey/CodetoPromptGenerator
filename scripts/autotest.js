#!/usr/bin/env node
// scripts/autotest.js

/**
 * AutoTest Script (Reads ports from ports.ini).
 * ---------------------------------------------------
 * This script performs checks on the Python backend (Flask) and
 * the Next.js frontend to ensure they satisfy project requirements.
 */
const fs = require('fs');
const path = require('path');
const { EOL } = require('os');

// --- Helper Functions --- (Copied from start.js)
function parseIni(iniContent) { /* ... same as in start.js ... */ }
function getPortConfig() { /* ... same as in start.js ... */ }
// --- End Helper Functions ---

// --- Main Test Logic ---
(async () => {
  const { default: fetch } = await import('node-fetch');

  // Get port configuration
  const { frontendPort, backendPort, backendUrl } = getPortConfig();
  const FRONTEND_BASE_URL = `http://localhost:${frontendPort}`;
  const BACKEND_BASE_URL = backendUrl; // Use the constructed URL

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
    const testDir = __dirname; // Using the scripts directory itself
    const url = `${BACKEND_BASE_URL}/api/projects/tree?rootDir=${encodeURIComponent(testDir)}`; // Use dynamic URL
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data)) throw new Error("Expected data to be an array of FileNode objects");
  });

   await runTest("Backend: POST /api/projects/files fetches file contents with correct tokenCount", async () => {
    const baseDir = path.dirname(__dirname); // Project root might be better? Let's use scripts dir parent
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
    if(fileItem.content.includes("File not found")) throw new Error("Backend reported file not found unexpectedly.");
  });

  await runTest("Backend: POST /api/projects/files returns 'File not found' for invalid path", async () => {
    const baseDir = __dirname;
    const resp = await fetch(`${BACKEND_BASE_URL}/api/projects/files`, { // Use dynamic URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseDir, paths: ["non_existent_file_12345.txt"] }),
    });
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data) || data.data.length !== 1) throw new Error("Expected exactly one file result");
    if (!data.data[0].content.includes("File not found on server")) throw new Error("Expected a 'File not found' message");
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


  // --- Results ---
  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
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
        frontendPort: '3000',
        backendPort: '5000',
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