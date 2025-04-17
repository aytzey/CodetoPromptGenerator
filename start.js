// start.js  – orchestrates venv‑backed Flask + Next.js dev
/* eslint-disable no-console */
const { spawn, spawnSync }   = require("child_process");
const path                   = require("path");
const fs                     = require("fs");
const os                     = require("os");
const net                    = require("net");
const { EOL }                = require("os");

const BACKEND_DIR = path.join(__dirname, "python_backend");
const VENV_DIR    = path.join(BACKEND_DIR, "venv");
const REQ_FILE    = path.join(BACKEND_DIR, "requirements.txt");
const PORTS_INI   = path.join(__dirname, "ports.ini");
const ENV_LOCAL   = path.join(__dirname, ".env.local");

const isWin = os.platform() === "win32";
const venvPy = () =>
  isWin
    ? path.join(VENV_DIR, "Scripts", "python.exe")
    : path.join(VENV_DIR, "bin", "python");

/* ─────────────────────────── helpers ──────────────────────────── */
const parseIni = (src) => {
  const out = {};
  let sec   = null;
  src.split(EOL).forEach((l) => {
    const s = l.trim();
    if (!s || s.startsWith("#") || s.startsWith(";")) return;
    if (s.startsWith("[") && s.endsWith("]")) {
      sec    = s.slice(1, -1).trim();
      out[sec] = {};
    } else if (sec) {
      const i = s.indexOf("=");
      if (i > 0) out[sec][s.slice(0, i).trim()] = s.slice(i + 1).trim();
    }
  });
  return out;
};

const cfgPorts = () => {
  const def = { fe: 3000, be: 5000, host: "127.0.0.1", proto: "http" };
  try {
    if (fs.existsSync(PORTS_INI)) {
      const ini = parseIni(fs.readFileSync(PORTS_INI, "utf8"));
      const fe  = +ini?.Ports?.Frontend || def.fe;
      const be  = +ini?.Ports?.Backend  || def.be;
      const host   = ini?.API?.Host     || def.host;
      const proto  = ini?.API?.Protocol || def.proto;
      return { fe, be, host, proto };
    }
  } catch {
    /* ignore – fall back to defaults */
  }
  return { fe: def.fe, be: def.be, host: def.host, proto: def.proto };
};

const portFree = (p) =>
  new Promise((r) => {
    const srv = net
      .createServer()
      .once("error", () => r(false))
      .once("listening", () => srv.close(() => r(true)))
      .listen(p, "0.0.0.0");
  });

const firstFree = async (start) => {
  let p = start;
  while (!(await portFree(p))) p += 1;
  return p;
};

const sysPython = () => {
  const candidates = isWin ? ["py", "python", "python3"] : ["python3", "python"];
  return candidates.find((c) => spawnSync(c, ["--version"], { stdio: "ignore" }).status === 0);
};

const ensureVenv = () => {
  const py = sysPython();
  if (!py) throw new Error("No system Python interpreter found.");

  if (!fs.existsSync(venvPy())) {
    console.log("[start] Creating virtual‑env…");
    if (spawnSync(py, ["-m", "venv", "venv"], { cwd: BACKEND_DIR, stdio: "inherit" }).status !== 0)
      throw new Error("venv creation failed");
  }

  /* make sure Flask (and friends) are installed */
  if (
    spawnSync(venvPy(), ["-c", "import flask, sys; sys.exit(0)"], { stdio: "ignore" }).status !== 0
  ) {
    console.log("[start] Installing backend deps…");
    const pip = isWin
      ? path.join(VENV_DIR, "Scripts", "pip.exe")
      : path.join(VENV_DIR, "bin", "pip");
    if (spawnSync(pip, ["install", "-r", REQ_FILE], { stdio: "inherit" }).status !== 0)
      throw new Error("pip install failed");
  }
};

const writeEnvLocal = (apiUrl) => {
  /* Persist current API URL so the browser code can read it at runtime
     (Next.js ships env vars at build‑time, so we rewrite the file **before**
     starting the dev server).                                               */
  fs.writeFileSync(ENV_LOCAL, `NEXT_PUBLIC_API_URL=${apiUrl}${EOL}`, "utf8");
};

/* ─────────────────────────── spawners ─────────────────────────── */
const startBackend = (port) => {
  ensureVenv();
  console.log(`↪︎  Backend  : http://127.0.0.1:${port}`);
  const env = { ...process.env, FLASK_PORT: port, FLASK_DEBUG: "True" };
  const p   = spawn(venvPy(), ["app.py"], { cwd: BACKEND_DIR, env, stdio: "inherit" });
  p.on("close", (c) => c && process.exit(c));
  return p;
};

const startFrontend = (port, apiUrl) => {
  console.log(`↪︎  Frontend : http://localhost:${port}    (API → ${apiUrl})`);
  writeEnvLocal(apiUrl);                                // <─── new
  const env = { ...process.env, PORT: String(port), NEXT_PUBLIC_API_URL: apiUrl };
  const p   = spawn("npm", ["run", "dev"], { cwd: __dirname, env, stdio: "inherit", shell: true });
  p.on("close", (c) => c && process.exit(c));
  return p;
};

/* ───────────────────────────── main ───────────────────────────── */
(async () => {
  const base      = cfgPorts();
  const fePort    = await firstFree(base.fe);
  const bePort    = (await firstFree(base.be)) === fePort ? await firstFree(base.be + 1) : base.be;
  const apiUrl    = `${base.proto}://${base.host}:${bePort}`;

  console.log(`\n📦  Ports  – Frontend ${fePort}  |  Backend ${bePort}`);

  const beProc = startBackend(bePort);
  const feProc = startFrontend(fePort, apiUrl);

  const stop = () => {
    beProc.kill("SIGINT");
    feProc.kill("SIGINT");
    process.exit(0);
  };
  process.on("SIGINT",  stop);
  process.on("SIGTERM", stop);
})();
