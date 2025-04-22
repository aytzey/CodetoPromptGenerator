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

// Store child process references
let backendProcess = null;
let frontendProcess = null;

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
  const def = { fe: 3010, be: 5010, host: "127.0.0.1", proto: "http" };
  // Use environment variables first, then ports.ini, then defaults
  def.fe = parseInt(process.env.PORT, 10) || def.fe;
  def.be = parseInt(process.env.FLASK_PORT, 10) || def.be;
  def.host = process.env.HOST || process.env.FLASK_HOST || def.host;
  def.proto = process.env.PROTOCOL || def.proto;

  try {
    if (fs.existsSync(PORTS_INI)) {
      const ini = parseIni(fs.readFileSync(PORTS_INI, "utf8"));
      // Read from INI only if environment variables were not set
      const fe  = parseInt(process.env.PORT, 10) || +ini?.Ports?.Frontend || def.fe;
      const be  = parseInt(process.env.FLASK_PORT, 10) || +ini?.Ports?.Backend  || def.be;
      const host   = process.env.HOST || process.env.FLASK_HOST || ini?.API?.Host     || def.host;
      const proto  = process.env.PROTOCOL || ini?.API?.Protocol || def.proto;

      // Basic validation for ports read from INI
      if (isNaN(fe) || isNaN(be)) {
        console.warn(`[ports.ini] Invalid port numbers detected. Using defaults/environment variables.`);
        return { fe: def.fe, be: def.be, host: def.host, proto: def.proto };
      }
      return { fe, be, host, proto };
    }
  } catch (e) {
    console.error(`[ports.ini] Error reading or parsing ${PORTS_INI}:`, e);
  }
  // Fallback to defaults/environment if INI fails or doesn't exist
  return { fe: def.fe, be: def.be, host: def.host, proto: def.proto };
};


const portFree = (port, host = '127.0.0.1') => // Check specific host
  new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      // Only return false if error is EADDRINUSE
      resolve(err.code !== 'EADDRINUSE');
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    // Ensure server attempts to listen on the specified host
    server.listen(port, host);
  });

const firstFree = async (start, host) => {
  let p = start;
  // Check ports starting from `start` until a free one is found on the specified host
  while (!(await portFree(p, host))) {
      console.warn(`[Port Check] Port ${p} on ${host} is busy, trying next...`);
      p += 1;
      if (p > start + 50) { // Avoid infinite loops in weird network scenarios
        throw new Error(`Could not find a free port near ${start} on ${host}`);
      }
  }
  console.log(`[Port Check] Port ${p} on ${host} is available.`);
  return p;
};

const sysPython = () => {
  const candidates = isWin ? ["py", "python", "python3"] : ["python3", "python"];
  for (const cmd of candidates) {
      // Use shell: true for Windows potentially needing `py`, and generally safer path resolution
      const result = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: true });
      if (result.status === 0 && !result.error) {
          console.log(`[Python Check] Found working Python: ${cmd}`);
          return cmd;
      }
  }
  console.error("[Python Check] No working Python interpreter found in PATH.");
  return null; // Return null clearly
};

const ensureVenv = () => {
  const py = sysPython();
  if (!py) throw new Error("No system Python interpreter found.");

  // Ensure VENV_DIR itself exists before checking python inside it
  if (!fs.existsSync(VENV_DIR)) {
      console.log(`[start] Creating virtual environment at ${VENV_DIR} using "${py}"...`);
      // Create venv relative to backend directory
      const venvResult = spawnSync(py, ["-m", "venv", VENV_DIR], {
          cwd: BACKEND_DIR, // Create venv inside backend dir
          stdio: "inherit",
          shell: true,
      });
      if (venvResult.status !== 0) {
          throw new Error("venv creation failed");
      }
      console.log("[start] Virtual environment created.");
  } else {
      console.log(`[start] Virtual environment found at ${VENV_DIR}.`);
  }

  /* Check if Flask is installed using the venv python */
  const venvPythonPath = venvPy();
  const checkFlaskCmd = isWin ? `"${venvPythonPath}" -c "import flask"` : `${venvPythonPath} -c "import flask"`;
  if (spawnSync(checkFlaskCmd, { shell: true, stdio: "ignore" }).status !== 0) {
      console.log("[start] Flask not found in venv. Installing backend dependencies...");
      const pipPath = isWin
          ? path.join(VENV_DIR, "Scripts", "pip.exe")
          : path.join(VENV_DIR, "bin", "pip");

      const pipArgs = ["install", "-r", REQ_FILE];
      // Quote path on windows just in case
      const pipCmd = isWin ? `"${pipPath}"` : pipPath;

      const pipResult = spawnSync(pipCmd, pipArgs, {
          cwd: BACKEND_DIR, // Run pip from backend dir
          stdio: "inherit",
          shell: true,
      });

      if (pipResult.status !== 0) {
          throw new Error(`pip install failed (Command: ${pipCmd} ${pipArgs.join(' ')})`);
      }
      console.log("[start] Backend dependencies installed.");
  } else {
      console.log("[start] Flask found in venv. Skipping dependency installation.");
  }
};


const writeEnvLocal = (apiUrl) => {
  const content = `NEXT_PUBLIC_API_URL=${apiUrl}${EOL}`;
  try {
      fs.writeFileSync(ENV_LOCAL, content, "utf8");
      console.log(`[start] Updated ${ENV_LOCAL} with API URL: ${apiUrl}`);
  } catch (err) {
      console.error(`[start] Error writing ${ENV_LOCAL}: ${err.message}`);
  }
};

/* ─────────────────────────── spawners ─────────────────────────── */
const startBackend = (port, host) => {
  ensureVenv(); // Ensure venv exists and deps are installed
  console.log(`[Backend] Starting Flask on http://${host}:${port}...`);
  const env = {
      ...process.env,
      FLASK_APP: 'app.py', // Explicitly set FLASK_APP
      FLASK_RUN_PORT: port.toString(),
      FLASK_RUN_HOST: host,
      FLASK_DEBUG: "True", // Keep debug for dev
      // Ensure Python path includes the venv potentially
      PYTHONUNBUFFERED: "1", // Often helpful for seeing logs immediately
  };
  // Use `flask run` command via the venv python interpreter
  const args = ['-m', 'flask', 'run'];
  backendProcess = spawn(venvPy(), args, {
      cwd: BACKEND_DIR,
      env,
      stdio: "inherit", // Pipe output directly
      // shell: false // Avoid shell if not needed
  });
  backendProcess.on("error", (err) => {
      console.error(`[Backend] Error spawning Flask: ${err.message}`);
      // Don't exit main script immediately, maybe frontend can still run
  });
  backendProcess.on("close", (code) => {
      console.log(`[Backend] Flask process exited with code ${code}`);
      backendProcess = null; // Clear reference
      // Optional: if Flask crashes, maybe stop frontend too?
      // if (code !== 0 && code !== null) {
      //    console.error("[Backend] Flask process exited unexpectedly. Stopping frontend...");
      //    if (frontendProcess) frontendProcess.kill('SIGINT');
      // }
  });
  return backendProcess;
};

const startFrontend = (port, host, apiUrl) => {
  const frontendUrl = `http://${host}:${port}`;
  console.log(`[Frontend] Starting Next.js on ${frontendUrl} (API -> ${apiUrl})...`);
  writeEnvLocal(apiUrl);
  const env = {
      ...process.env,
      PORT: port.toString(), // Next.js uses PORT
      HOST: host, // Pass HOST if needed by Next.js
      NEXT_PUBLIC_API_URL: apiUrl
  };
  // Use `cross-env` potentially if env vars are tricky, but try direct first
  // Pass --port and --hostname args to `next dev` via `npm run dev --`
  frontendProcess = spawn("npm", ["run", "dev", "--", "--port", port.toString(), "--hostname", host], {
      cwd: __dirname,
      env,
      stdio: "inherit",
      shell: isWin // Use shell on windows for npm compatibility
  });
  frontendProcess.on("error", (err) => {
      console.error(`[Frontend] Error spawning Next.js: ${err.message}`);
       // Don't exit main script immediately
  });
  frontendProcess.on("close", (code) => {
      console.log(`[Frontend] Next.js process exited with code ${code}`);
      frontendProcess = null; // Clear reference
      // Optional: if Next.js crashes, maybe stop backend too?
      // if (code !== 0 && code !== null) {
      //    console.error("[Frontend] Next.js process exited unexpectedly. Stopping backend...");
      //    if (backendProcess) backendProcess.kill('SIGINT');
      // }
  });
  return frontendProcess;
};

/* ────────────────── Graceful Shutdown Handler ─────────────────── */
function cleanupAndExit(signal) {
    console.log(`\n[Main] Received ${signal}. Shutting down processes...`);
    let backendKilled = false;
    let frontendKilled = false;
    const exitCode = (signal === 'SIGINT' || signal === 'SIGTERM') ? 0 : 1; // Use 0 for clean signals

    // Function to attempt killing a process
    const killProcess = (proc, name, sig = 'SIGINT') => {
        if (proc && !proc.killed) {
            console.log(`[Main] Sending ${sig} to ${name} process (PID: ${proc.pid})...`);
            try {
                // Sending signal to the process group ID (-pid) can help kill children,
                // but requires the process not be detached and might not work on Windows.
                // Sticking to pid for wider compatibility first.
                const killed = proc.kill(sig);
                if (killed) {
                    console.log(`[Main] Signal ${sig} sent to ${name}.`);
                    return true;
                } else {
                    console.warn(`[Main] Failed to send ${sig} to ${name}. Process might have already exited.`);
                    return false; // Indicate potential failure or already exited
                }
            } catch (e) {
                console.error(`[Main] Error sending ${sig} to ${name}: ${e.message}`);
                return false; // Indicate error
            }
        }
        return true; // No process or already killed
    };

    // Attempt to kill frontend first
    frontendKilled = killProcess(frontendProcess, 'Next.js');
    frontendProcess = null; // Clear reference

    // Attempt to kill backend
    backendKilled = killProcess(backendProcess, 'Flask');
    backendProcess = null; // Clear reference

    // Optionally wait a brief moment before exiting forcefully if needed
    // but process.exit should trigger the exit handlers of children if signaled correctly
    console.log("[Main] Exiting.");
    process.exit(exitCode);

}

// Register signal handlers
process.on('SIGINT', () => cleanupAndExit('SIGINT'));  // Catches Ctrl+C
process.on('SIGTERM', () => cleanupAndExit('SIGTERM')); // Catches kill commands
process.on('exit', (code) => {
    // This handler runs AFTER the process event loop is empty.
    // Killing processes here might be too late if they haven't responded to signals.
    // Primarily for logging the exit code.
    console.log(`[Main] Script process exited with code ${code}.`);
    // Ensure references are null if exit happens unexpectedly without signal handling completing
    frontendProcess = null;
    backendProcess = null;
});


/* ───────────────────────────── main ───────────────────────────── */
(async () => {
  try {
      console.log("[Main] Starting application setup...");
      const base = cfgPorts();
      console.log(`[Main] Configured base ports: FE=${base.fe}, BE=${base.be}, Host=${base.host}`);

      // Ensure Venv and dependencies are ready *before* checking ports,
      // as the check might fail if python isn't ready.
       console.log("[Main] Ensuring Python virtual environment and dependencies...");
       ensureVenv();
       console.log("[Main] Python environment ready.");

      // Check and find free ports using the configured host
      console.log("[Main] Checking port availability...");
      const bePort = await firstFree(base.be, base.host);
      const fePort = await firstFree(base.fe, base.host);

      if (fePort === bePort) {
          // This case should be less likely now with sequential checks, but good to keep.
          console.error(`[Error] Frontend and Backend ports conflict (${fePort}). Please configure different ports.`);
          process.exit(1);
      }

      const apiUrl = `${base.proto}://${base.host}:${bePort}`;
      console.log(`\n📦 Ports Assigned: Frontend http://${base.host}:${fePort} | Backend ${apiUrl}`);

      console.log("[Main] Starting backend process...");
      startBackend(bePort, base.host); // Pass host

      // Optional delay to allow backend to start before frontend tries to connect? Usually not needed.
      // await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("[Main] Starting frontend process...");
      startFrontend(fePort, base.host, apiUrl); // Pass host

      console.log("[Main] Application processes started.");

  } catch (error) {
      console.error(`\n[Error] Failed to start application: ${error.message}`);
      console.error(error.stack); // Log stack trace for debugging
      // Attempt cleanup even on startup error
      cleanupAndExit('STARTUP_ERROR');
      process.exit(1);
  }
})();