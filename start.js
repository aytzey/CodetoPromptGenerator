// start.js  – orchestrates venv‑backed Flask + Next.js dev
/* eslint-disable no-console */
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const net = require("net");
const { EOL } = require("os");

const BACKEND_DIR = path.join(__dirname, "python_backend");
const VENV_DIR = path.join(BACKEND_DIR, "venv");
const REQ_FILE = path.join(BACKEND_DIR, "requirements.txt");
const PORTS_INI = path.join(__dirname, "ports.ini");

const isWin = os.platform() === "win32";
const venvPy = () =>
  isWin
    ? path.join(VENV_DIR, "Scripts", "python.exe")
    : path.join(VENV_DIR, "bin", "python");

/*──────────────── port helpers ────────────────*/
function parseIni(src) {
  const res = {};
  let sec = null;
  src.split(EOL).forEach((l) => {
    const line = l.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) return;
    if (line.startsWith("[") && line.endsWith("]")) {
      sec = line.slice(1, -1).trim();
      res[sec] = {};
    } else if (sec) {
      const i = line.indexOf("=");
      if (i > 0) res[sec][line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  });
  return res;
}
function cfgPorts() {
  const def = { fe: 3000, be: 5000, host: "127.0.0.1", proto: "http" };
  try {
    if (fs.existsSync(PORTS_INI)) {
      const ini = parseIni(fs.readFileSync(PORTS_INI, "utf8"));
      const fe = +ini?.Ports?.Frontend || def.fe;
      const be = +ini?.Ports?.Backend || def.be;
      const host = ini?.API?.Host || def.host;
      const proto = ini?.API?.Protocol || def.proto;
      return { fe, be, url: `${proto}://${host}:${be}` };
    }
  } catch (e) {
    console.warn("[start] Failed to parse ports.ini – using defaults");
  }
  return { fe: def.fe, be: def.be, url: `${def.proto}://${def.host}:${def.be}` };
}
const portFree = (port) =>
  new Promise((r) => {
    const srv = net.createServer()
      .once("error", () => r(false))
      .once("listening", () => srv.close(() => r(true)))
      .listen(port, "0.0.0.0");
  });
async function firstFree(startPort) {
  let p = startPort;
  while (!(await portFree(p))) p += 1;
  return p;
}

/*──────────────── venv helpers ────────────────*/
function sysPython() {
  const cands = isWin ? ["py", "python", "python3"] : ["python3", "python"];
  for (const c of cands) {
    if (spawnSync(c, ["--version"], { stdio: "ignore" }).status === 0) return c;
  }
  return null;
}
function ensureVenv() {
  const py = sysPython();
  if (!py) throw new Error("No system Python found.");
  if (!fs.existsSync(venvPy())) {
    console.log("[start] Creating virtual‑env…");
    if (spawnSync(py, ["-m", "venv", "venv"], { cwd: BACKEND_DIR, stdio: "inherit" }).status !== 0)
      throw new Error("venv creation failed");
  }
  // if flask missing → pip install
  if (spawnSync(venvPy(), ["-c", "import flask, sys; sys.exit(0)"], { stdio: "ignore" }).status !== 0) {
    console.log("[start] Installing backend deps…");
    const pip = isWin ? path.join(VENV_DIR, "Scripts", "pip.exe") : path.join(VENV_DIR, "bin", "pip");
    if (spawnSync(pip, ["install", "-r", REQ_FILE], { stdio: "inherit" }).status !== 0)
      throw new Error("pip install failed");
  }
}

/*──────────────── spawners ────────────────*/
function startBackend(port) {
  ensureVenv();
  console.log(`↪︎  Backend  : http://127.0.0.1:${port}`);
  const env = { ...process.env, FLASK_PORT: port, FLASK_DEBUG: "True" };
  const p = spawn(venvPy(), ["app.py"], { cwd: BACKEND_DIR, env, stdio: "inherit" });
  p.on("close", (c) => c && process.exit(c));
  return p;
}
function startFrontend(port, apiUrl) {
  console.log(`↪︎  Frontend : http://localhost:${port}    (API → ${apiUrl})`);
  const env = { ...process.env, PORT: String(port), NEXT_PUBLIC_API_URL: apiUrl };
  const p = spawn("npm", ["run", "dev"], { cwd: __dirname, env, stdio: "inherit", shell: true });
  p.on("close", (c) => c && process.exit(c));
  return p;
}

/*──────────────── main ────────────────*/
(async () => {
  const cfg = cfgPorts();
  cfg.fe = await firstFree(cfg.fe);
  cfg.be = await firstFree(cfg.be);

  console.log(`\n📦  Ports  – Frontend ${cfg.fe}  |  Backend ${cfg.be}`);

  const beProc = startBackend(cfg.be);
  const feProc = startFrontend(cfg.fe, `${cfg.url.split(":").slice(0, -1).join(":")}:${cfg.be}`);

  const stop = () => {
    beProc.kill("SIGINT");
    feProc.kill("SIGINT");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})();
