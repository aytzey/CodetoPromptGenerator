#!/usr/bin/env node
// scripts/autotest.js

/**
 * AutoTest Script (with one extra health-check test).
 * ---------------------------------------------------
 * This script performs checks on the Python backend (Flask) and
 * the Next.js frontend to ensure they satisfy project requirements.
 */

(async () => {
  const { default: fetch } = await import('node-fetch');

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

  console.log("Starting AutoTest for Next.js + Python backend...\n");

  // --------------------------------------------------------------------------
  // EXTRA: Health check
  // --------------------------------------------------------------------------
  await runTest("Backend: GET /health returns healthy status", async () => {
    const resp = await fetch("http://localhost:5000/health");
    if (!resp.ok) {
      throw new Error("Expected HTTP 200 but got " + resp.status);
    }
    const data = await resp.json();
    if (!data.status || data.status !== "healthy") {
      throw new Error("Expected { status: 'healthy' } in response");
    }
  });

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

  // Additional negative test for empty text
  await runTest("Backend: POST /api/todos with empty text yields 400", async () => {
    const resp = await fetch("http://localhost:5000/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
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

  await runTest("Backend: GET /api/projects/tree returns valid structure for known directory", async () => {
    const testDir = __dirname; // for example
    const url = `http://localhost:5000/api/projects/tree?rootDir=${encodeURIComponent(testDir)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Expected HTTP 200 but got " + resp.status);

    const data = await resp.json();
    if (!data.success) throw new Error("Expected success=true in response");
    if (!Array.isArray(data.data)) {
      throw new Error("Expected data to be an array of FileNode objects");
    }
  });

  await runTest("Backend: POST /api/projects/files fetches file contents with correct tokenCount", async () => {
    // We'll attempt to fetch the content of this very file.
    const baseDir = __dirname.replace(/\\/g, "/");
    const relativePaths = ["autotest.js"];
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

  await runTest("Frontend: GET /some-invalid-route yields 200 or 404", async () => {
    const resp = await fetch("http://localhost:3000/some-non-existent-route");
    if (resp.status !== 200 && resp.status !== 404) {
      throw new Error("Expected a 200 or 404, got " + resp.status);
    }
  });

  // --------------------------------------------------------------------------
  // Results
  // --------------------------------------------------------------------------
  console.log(`\nTests completed. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.error(red("Some tests failed. Check logs above."));
    process.exit(1);
  } else {
    console.log(green("All tests passed successfully!"));
    process.exit(0);
  }
})();
