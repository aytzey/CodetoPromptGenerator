#!/usr/bin/env node

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const isProd = process.argv.includes("--prod");
const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "python_backend");
const host = process.env.FLASK_HOST || "127.0.0.1";
const port = process.env.BACKEND_PORT || process.env.FLASK_PORT || "5010";

const venvPython =
  os.platform() === "win32"
    ? path.join(backendDir, "venv", "Scripts", "python.exe")
    : path.join(backendDir, "venv", "bin", "python");

function commandExists(cmd) {
  const probe = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return probe.status === 0 && !probe.error;
}

function resolvePython() {
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  const candidates =
    os.platform() === "win32" ? ["py", "python", "python3"] : ["python3", "python"];

  for (const candidate of candidates) {
    if (commandExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function hasGunicorn(pythonCmd) {
  const probe = spawnSync(
    pythonCmd,
    ["-c", "import importlib.util; import sys; sys.exit(0 if importlib.util.find_spec('gunicorn') else 1)"],
    { stdio: "ignore" },
  );
  return probe.status === 0;
}

const pythonCmd = resolvePython();
if (!pythonCmd) {
  console.error("[backend] Python interpreter not found. Install Python or create python_backend/venv.");
  process.exit(1);
}

let backendArgs = ["python_backend/app.py"];

if (isProd) {
  if (hasGunicorn(pythonCmd)) {
    backendArgs = [
      "-m",
      "gunicorn",
      "-w",
      "2",
      "-b",
      `${host}:${port}`,
      "--timeout",
      "120",
      "--chdir",
      "python_backend",
      "app:app",
    ];
  } else {
    console.warn("[backend] gunicorn is unavailable; falling back to Flask server.");
  }
}

const child = spawn(pythonCmd, backendArgs, {
  cwd: repoRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    FLASK_HOST: host,
    FLASK_PORT: String(port),
    FLASK_DEBUG: isProd ? "0" : process.env.FLASK_DEBUG || "1",
    APP_ENV: isProd ? "production" : process.env.APP_ENV || "development",
  },
});

child.on("error", (error) => {
  console.error("[backend] Failed to start Python backend:", error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
