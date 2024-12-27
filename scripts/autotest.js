#!/usr/bin/env node
// scripts/autotest.js

/**
 * AutoTest Script (Dynamic Import for node-fetch v3+)
 * ---------------------------------------------------
 * This script performs checks on the Python backend (Flask) and
 * the Next.js frontend to ensure they satisfy project requirements.
 *
 * Usage:
 *   1. Ensure the Python backend is running at http://localhost:5000
 *      (e.g., via `python app.py`).
 *   2. Ensure the Next.js frontend is running at http://localhost:3000
 *      (e.g., via `npm run dev`).
 *   3. Run `node scripts/autotest.js`.
 *
 * Note: Since node-fetch v3 is ESM-only, we dynamically import it below.
 */

(async () => {
  // Dynamically import node-fetch in CommonJS
  const { default: fetch } = await import('node-fetch');

  // Simple color utilities for console output
  const green = str => `\x1b[32m${str}\x1b[0m`;
  const red = str => `\x1b[31m${str}\x1b[0m`;

  let passed = 0;
  let failed = 0;

  /**
   * Helper to run async tests with standardized pass/fail output.
   */
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

  console.log("Starting AutoTest for Next.js + Python backend...\n");

  // --------------------------------------------------------------------------
  // (1) BACKEND: TODO ENDPOINTS
  // --------------------------------------------------------------------------
  await runTest("Backend: GET /api/todos returns array with success=true", async () => {
    const resp = await fetch("http://localhost:5000/api/todos");
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data)) throw new Error("Expected data to be an array");
  });

  await runTest("Backend: POST /api/todos can create new todo", async () => {
    const resp = await fetch("http://localhost:5000/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "auto-test item" }),
    });
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!data.data || !data.data.id) {
      throw new Error("Expected new todo with an 'id'");
    }
  });

  // CHANGED: Additional negative test for empty text
  await runTest("Backend: POST /api/todos with empty text yields 400", async () => {
    const resp = await fetch("http://localhost:5000/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    // We expect a 400
    if (resp.status !== 400) {
      throw new Error("Expected HTTP 400 when posting an empty todo text");
    }
  });

  await runTest("Backend: DELETE /api/todos/:id removes the specified todo", async () => {
    // First create a new todo
    const newResp = await fetch("http://localhost:5000/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "delete-me" }),
    });
    const newData = await newResp.json();
    if (!newData.success) throw new Error("Failed to create a todo for deletion test");

    const todoId = newData.data.id;
    // Now delete it
    const deleteResp = await fetch(`http://localhost:5000/api/todos/${todoId}`, {
      method: "DELETE"
    });
    if (!deleteResp.ok) throw new Error("Expected HTTP 200 but got " + deleteResp.status);
    const delRes = await deleteResp.json();
    if (!delRes.success) throw new Error("Expected success=true in delete response");
  });

  // --------------------------------------------------------------------------
  // (2) BACKEND: PROJECTS/TREE & FILES ENDPOINTS
  // --------------------------------------------------------------------------
  await runTest("Backend: GET /api/projects/tree errors if rootDir is missing", async () => {
    const resp = await fetch("http://localhost:5000/api/projects/tree");
    if (resp.status !== 400) {
      throw new Error("Expected status 400 for missing rootDir. Got " + resp.status);
    }
  });

  // CHANGED: Additional check for a valid directory (modify the path below as you wish)
  await runTest("Backend: GET /api/projects/tree returns valid structure for a known directory", async () => {
    // You can adjust this path to match your environment
    const testDir = __dirname; // e.g. the scripts folder
    const url = `http://localhost:5000/api/projects/tree?rootDir=${encodeURIComponent(testDir)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);

    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data)) {
      throw new Error("Expected data to be an array of FileNode objects");
    }
    if (data.data.length === 0) {
      console.warn("Warning: The test directory might be empty or filtered out.");
    }
  });

  // CHANGED: Test POST /api/projects/files to retrieve content of known files
  await runTest("Backend: POST /api/projects/files fetches file contents with correct tokenCount", async () => {
    // We'll attempt to fetch the content of this very file (autotest.js) as an example
    const baseDir = __dirname.replace(/\\/g, "/"); // unify slashes
    const relativePaths = ["autotest.js"]; // assuming this file is inside scripts/
    const resp = await fetch("http://localhost:5000/api/projects/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseDir, paths: relativePaths }),
    });
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);

    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data) || data.data.length !== 1) {
      throw new Error("Expected data to be an array of length 1");
    }
    const fileItem = data.data[0];
    if (!fileItem.content || fileItem.tokenCount < 1) {
      throw new Error("File content or tokenCount missing/invalid");
    }
  });

  // CHANGED: Negative test for a non-existent file
  await runTest("Backend: POST /api/projects/files returns 'File not found' for invalid path", async () => {
    const baseDir = __dirname.replace(/\\/g, "/");
    const resp = await fetch("http://localhost:5000/api/projects/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseDir, paths: ["does_not_exist.txt"] }),
    });
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);

    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data) || data.data.length !== 1) {
      throw new Error("Expected exactly one file result");
    }
    if (!data.data[0].content.includes("File not found on server")) {
      throw new Error("Expected a 'File not found' message for invalid path");
    }
  });

  // --------------------------------------------------------------------------
  // (3) FRONTEND: BASIC CHECKS
  // --------------------------------------------------------------------------
  await runTest("Frontend: GET / (index page) returns HTML content", async () => {
    const resp = await fetch("http://localhost:3000");
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);
    const text = await resp.text();
    if (!text.includes("<!DOCTYPE html") && !text.includes("<div id=\"__next\">")) {
      throw new Error("Expected Next.js HTML content on the index page");
    }
  });

  // CHANGED: Additional minimal check for a front-end route
  // In a real scenario, you'd do more thorough tests with a headless browser or something like Cypress.
  // We'll just confirm the path /some-non-existent-page returns a 200 or 404 from Next.js (this can vary).
  await runTest("Frontend: GET /some-invalid-route yields a Next.js 404 or SSR fallback", async () => {
    const resp = await fetch("http://localhost:3000/some-non-existent-route");
    // Next.js typically returns 200 with a custom 404 page or an actual 404 status
    if (resp.status !== 200 && resp.status !== 404) {
      throw new Error("Expected a 200 or 404, got " + resp.status);
    }
  });

  // --------------------------------------------------------------------------
  // Display final results
  // --------------------------------------------------------------------------
  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error(red("Some tests failed. Check the logs above for details."));
    process.exit(1);
  } else {
    console.log(green("All tests passed successfully!"));
    process.exit(0);
  }
})();
