#!/usr/bin/env node

const { spawn, spawnSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const webPort = Number.parseInt(process.env.WEB_PORT || "3010", 10);
const webHost = process.env.WEB_HOST || "127.0.0.1";

function canRun(cmd) {
  const probe = spawnSync(cmd, ["--version"], { encoding: "utf8" });
  return probe.status === 0 && !probe.error;
}

function collectPidsFromOutput(text) {
  const pids = new Set();
  if (!text) return pids;

  const pidRegex = /pid=(\d+)/g;
  let match = null;
  while ((match = pidRegex.exec(text)) !== null) {
    pids.add(Number.parseInt(match[1], 10));
  }

  text
    .split(/[\s\r\n]+/)
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .forEach((pid) => pids.add(Number.parseInt(pid, 10)));

  return pids;
}

function collectPortPids(port) {
  const pids = new Set();

  if (canRun("ss")) {
    const out = spawnSync("ss", ["-ltnpH", `( sport = :${port} )`], {
      encoding: "utf8",
    });
    if (out.stdout) {
      collectPidsFromOutput(out.stdout).forEach((pid) => pids.add(pid));
    }
  }

  if (canRun("fuser")) {
    const out = spawnSync("fuser", ["-n", "tcp", String(port)], {
      encoding: "utf8",
      stderr: "pipe",
    });
    if (out.stdout) {
      collectPidsFromOutput(out.stdout).forEach((pid) => pids.add(pid));
    }
  }

  if (canRun("lsof")) {
    const out = spawnSync("lsof", ["-ti", `tcp:${port}`], {
      encoding: "utf8",
    });
    if (out.stdout) {
      collectPidsFromOutput(out.stdout).forEach((pid) => pids.add(pid));
    }
  }

  return Array.from(pids);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function killPidsGracefully(pids) {
  if (!pids.length) return;

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore non-existing / unauthorized processes.
    }
  }

  await wait(400);

  for (const pid of pids) {
    try {
      process.kill(pid, 0);
      process.kill(pid, "SIGKILL");
    } catch {
      // Process already exited or cannot be signaled.
    }
  }
}

function runKillPortCli(port) {
  const localCli = path.join(repoRoot, "node_modules", ".bin", "kill-port");
  const command = process.platform === "win32" ? `${localCli}.cmd` : localCli;
  const hasLocalCli = spawnSync(command, ["--help"], {
    stdio: "ignore",
    shell: false,
  }).status === 0;

  if (hasLocalCli) {
    spawnSync(command, [String(port)], { stdio: "ignore" });
    return;
  }

  spawnSync("npx", ["--yes", "kill-port", String(port)], { stdio: "ignore" });
}

async function main() {
  runKillPortCli(webPort);
  const pids = collectPortPids(webPort);
  await killPidsGracefully(pids);

  const nextBin = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "dev", "-p", String(webPort), "-H", webHost], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (error) => {
    console.error("[dev] Failed to start Next.js:", error.message);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error("[dev] Unexpected startup failure:", error);
  process.exit(1);
});

