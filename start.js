// start.js – v2 (2025-04-25)
// ---------------------------------------------------------------------------
// ❶  NEW  → children are started in their own *process-group* (`detached: true`)
// ❷  NEW  → cleanup now calls  kill(-pgid)  (POSIX)  or  taskkill /T  (Windows)
// ❸  MINOR→ consolidated spawn-options + small log tidy-ups
/* eslint-disable no-console */
const { spawn, spawnSync } = require("child_process");
const path                 = require("path");
const fs                   = require("fs");
const os                   = require("os");
const net                  = require("net");
const { EOL }              = require("os");

/* ────────────── constants (unchanged) ────────────── */
const BACKEND_DIR = path.join(__dirname, "python_backend");
const VENV_DIR    = path.join(BACKEND_DIR, "venv");
const REQ_FILE    = path.join(BACKEND_DIR, "requirements.txt");
const PORTS_INI   = path.join(__dirname, "ports.ini");
const ENV_LOCAL   = path.join(__dirname, ".env.local");

const isWin   = os.platform() === "win32";
const venvPy  = () => (isWin ? path.join(VENV_DIR, "Scripts", "python.exe")
                             : path.join(VENV_DIR, "bin", "python"));

/* ────────────── process handles ────────────── */
let backendProc = null;
let frontendProc = null;

/* ────────────── tiny helpers  ─────────────── */
const parseIni = (src) => {
  const out = {};
  let sec = null;
  src.split(EOL).forEach((l) => {
    const s = l.trim();
    if (!s || s.startsWith("#") || s.startsWith(";")) return;
    if (s.startsWith("[") && s.endsWith("]")) {
      sec = s.slice(1, -1).trim();
      out[sec] = {};
    } else if (sec) {
      const i = s.indexOf("=");
      if (i > 0) out[sec][s.slice(0, i).trim()] = s.slice(i + 1).trim();
    }
  });
  return out;
};

const cfgPorts = () => {
  const def = { fe: 3010, be: 5010, host: "127.0.0.1", proto: "http" };
  def.fe   = parseInt(process.env.PORT       || def.fe, 10);
  def.be   = parseInt(process.env.FLASK_PORT || def.be, 10);
  def.host = process.env.HOST        || process.env.FLASK_HOST || def.host;
  def.proto = process.env.PROTOCOL   || def.proto;

  if (fs.existsSync(PORTS_INI)) {
    try {
      const ini = parseIni(fs.readFileSync(PORTS_INI, "utf8"));
      def.fe   = def.fe   || +ini?.Ports?.Frontend || def.fe;
      def.be   = def.be   || +ini?.Ports?.Backend  || def.be;
      def.host = def.host || ini?.API?.Host        || def.host;
      def.proto= def.proto|| ini?.API?.Protocol    || def.proto;
    } catch (e) {
      console.warn("[ports.ini] could not be parsed – ignoring.", e.message);
    }
  }
  return def;
};

const portFree = (port, host) => new Promise((ok) => {
  const srv = net.createServer()
    .once("error", (err) => ok(err.code !== "EADDRINUSE"))
    .once("listening", () => srv.close(() => ok(true)))
    .listen(port, host);
});

const firstFree = async (start, host) => {
  let p = start;
  for (let i = 0; i < 60; i += 1, p += 1) {
    if (await portFree(p, host)) return p;
  }
  throw new Error(`No free port near ${start} on ${host}`);
};

/* ────────────── python / venv bootstrap (unchanged) ────────────── */
const sysPython = () => {
  const cands = isWin ? ["py", "python", "python3"] : ["python3", "python"];
  for (const cmd of cands) {
    const r = spawnSync(cmd, ["--version"], { stdio: "ignore", shell: true });
    if (r.status === 0) return cmd;
  }
  return null;
};

const ensureVenv = () => {
  const py = sysPython();
  if (!py) throw new Error("No system python in PATH.");

  if (!fs.existsSync(VENV_DIR)) {
    console.log(`[venv] creating at ${VENV_DIR}`);
    if (spawnSync(py, ["-m", "venv", VENV_DIR], { stdio: "inherit", shell: true, cwd: BACKEND_DIR }).status !== 0)
      throw new Error("venv creation failed");
  }

  const pip = isWin ? path.join(VENV_DIR, "Scripts", "pip.exe")
                    : path.join(VENV_DIR, "bin", "pip");
  const chk = spawnSync(venvPy(), ["-c", "import flask"], { stdio: "ignore" });
  if (chk.status !== 0) {
    console.log("[venv] installing backend deps …");
    if (spawnSync(pip, ["install", "-r", REQ_FILE], { stdio: "inherit" }).status !== 0)
      throw new Error("pip install failed");
  }
};

/* ────────────── child-process spawners ────────────── */
const spawnOpts = { stdio: "inherit", detached: true }; // ❶ DETACHED!

const startBackend = (port, host) => {
  ensureVenv();
  console.log(`[backend] ➜  http://${host}:${port}`);
  backendProc = spawn(
    venvPy(),
    ["-m", "flask", "run"],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        FLASK_APP: "app.py",
        FLASK_RUN_PORT: `${port}`,
        FLASK_RUN_HOST: host,
        FLASK_DEBUG: "True",
        PYTHONUNBUFFERED: "1",
      },
      ...spawnOpts,
    },
  );
};

const startFrontend = (port, host, apiUrl) => {
  fs.writeFileSync(ENV_LOCAL, `NEXT_PUBLIC_API_URL=${apiUrl}\n`, "utf8");
  console.log(`[frontend] ➜  http://${host}:${port}    (API → ${apiUrl})`);
  frontendProc = spawn(
    "npm",
    ["run", "dev", "--", "--port", `${port}`, "--hostname", host],
    {
      cwd: __dirname,
      env: { ...process.env, PORT: `${port}`, HOST: host, NEXT_PUBLIC_API_URL: apiUrl },
      shell: isWin,
      ...spawnOpts,
    },
  );
};

/* ────────────── graceful shutdown – kill *groups* ────────────── */
const killTree = (proc, name, signal = "SIGTERM") => {
  if (!proc || proc.killed) return;
  if (isWin) {
    // `/T` → kill child processes too   `/F` → force
    spawnSync("taskkill", ["/PID", proc.pid, "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    // Negative PID → "process group id"
    process.kill(-proc.pid, signal);
  } catch (e) {
    console.warn(`[shutdown] could not kill ${name}:`, e.message);
  }
};

const shutdown = (sig) => {
  console.log(`\n[shutdown] ${sig} received – cleaning up …`);
  killTree(frontendProc, "frontend");
  killTree(backendProc, "backend");
  process.exit(0);
};

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/* ────────────── main ────────────── */
(async () => {
  try {
    const { fe, be, host, proto } = cfgPorts();
    const bePort = await firstFree(be, host);
    const fePort = (bePort === fe) ? await firstFree(fe + 1, host) : fe;

    const apiUrl = `${proto}://${host}:${bePort}`;
    console.log(`\n📊 ports →  FE:${fePort}  BE:${bePort}`);

    startBackend(bePort, host);
    startFrontend(fePort, host, apiUrl);
  } catch (err) {
    console.error("[startup] fatal:", err);
    shutdown("ERROR");
  }
})();
