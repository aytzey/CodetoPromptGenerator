// File: start.js
// REFACTOR / OVERWRITE
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { EOL } = require('os'); // Import End of Line constant

// --- Configuration ---
const BACKEND_DIR = path.join(__dirname, 'python_backend');
const PYTHON_COMMAND = os.platform() === 'win32' ? 'python' : 'python3';
const BACKEND_SCRIPT = 'app.py';
const FRONTEND_COMMAND = 'npm';
const FRONTEND_ARGS_DEV = ['run', 'dev']; // Args for development
const FRONTEND_ARGS_START = ['run', 'start']; // Args for production start (if needed)
const PORTS_INI_PATH = path.join(__dirname, 'ports.ini');

// --- Helper Functions ---

/**
 * Parses a simple INI file content.
 * Handles sections [SectionName] and key=value pairs.
 * Ignores comments (# or ;) and empty lines.
 * @param {string} iniContent Content of the INI file.
 * @returns {object} Parsed object, e.g., { SectionName: { key: 'value' } }
 */
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

/**
 * Reads and parses the ports.ini file.
 * Provides default ports if file not found or invalid.
 * @returns {{frontendPort: string, backendPort: string, backendUrl: string}}
 */
function getPortConfig() {
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

            // Basic validation
            if (isNaN(parseInt(frontendPort)) || isNaN(parseInt(backendPort))) {
                console.warn(`[ports.ini] Invalid port numbers found. Using defaults.`);
                return { ...defaults, backendUrl: `${defaults.protocol}://${defaults.host}:${defaults.backendPort}` };
            }

            const backendUrl = `${protocol}://${host}:${backendPort}`;
            console.log(`[ports.ini] Loaded ports - Frontend: ${frontendPort}, Backend: ${backendPort}, API URL: ${backendUrl}`);
            return { frontendPort, backendPort, backendUrl };
        } else {
            console.warn(`[ports.ini] File not found at ${PORTS_INI_PATH}. Using default ports.`);
        }
    } catch (error) {
        console.error(`[ports.ini] Error reading or parsing ${PORTS_INI_PATH}:`, error);
        console.warn(`[ports.ini] Using default ports due to error.`);
    }
    // Return defaults if file doesn't exist or error occurred
    return { ...defaults, backendUrl: `${defaults.protocol}://${defaults.host}:${defaults.backendPort}` };
}

// (Keep checkPythonDependencies and installPythonDependencies as they were)
async function checkPythonDependencies() { /* ... same as before ... */ }
async function installPythonDependencies() { /* ... same as before ... */ }


/**
 * Starts the backend Flask server.
 * @param {string} backendPort Port for the backend.
 * @returns {ChildProcess} The spawned backend process.
 */
function startBackend(backendPort) {
    console.log(`Starting backend server from ${BACKEND_DIR} on port ${backendPort}...`);
    const backendEnv = {
        ...process.env,
        FLASK_DEBUG: 'True', // Keep debug for development
        FLASK_PORT: backendPort // Pass port via environment variable
    };

    const backend = spawn(PYTHON_COMMAND, [BACKEND_SCRIPT], {
        cwd: BACKEND_DIR,
        shell: true,
        stdio: 'inherit',
        env: backendEnv
    });

    backend.on('error', (err) => {
        console.error(`[Backend] Failed to start process: ${err.message}`);
        process.exit(1); // Exit if backend fails to start
    });
    backend.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`[Backend] Server exited unexpectedly with code ${code}`);
            // Optionally attempt restart or just exit
            process.exit(code || 1);
        } else {
             console.log(`[Backend] Server stopped (Code: ${code})`);
        }
    });
    return backend;
}

/**
 * Starts the frontend Next.js development server.
 * @param {string} frontendPort Port for the frontend.
 * @param {string} backendUrl API URL for the frontend to connect to.
 * @returns {ChildProcess} The spawned frontend process.
 */
function startFrontend(frontendPort, backendUrl) {
    console.log(`Starting frontend server on port ${frontendPort}...`);
    const frontendEnv = {
        ...process.env,
        PORT: frontendPort, // Next.js respects the PORT env variable
        NEXT_PUBLIC_API_URL: backendUrl // Pass backend URL via env var
    };

    // Using npm run dev which might internally set the port again,
    // but PORT env var should take precedence for `next dev`.
    const frontend = spawn(FRONTEND_COMMAND, FRONTEND_ARGS_DEV, {
        cwd: __dirname, // Run from project root
        shell: true,
        stdio: 'inherit',
        env: frontendEnv
    });

    frontend.on('error', (err) => {
        console.error(`[Frontend] Failed to start process: ${err.message}`);
        process.exit(1); // Exit if frontend fails to start
    });

    frontend.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`[Frontend] Server exited unexpectedly with code ${code}`);
            process.exit(code || 1);
        } else {
             console.log(`[Frontend] Server stopped (Code: ${code})`);
        }
    });
    return frontend;
}

// --- Graceful Shutdown Setup --- (Keep as is)
function setupGracefulShutdown(backend, frontend) { /* ... same as before ... */ }


// --- Main Execution Logic ---
async function main() {
    try {
        // 1. Get Port Configuration
        const { frontendPort, backendPort, backendUrl } = getPortConfig();

        // 2. Check/Install Python Dependencies (optional)
        // Consider adding a command-line flag to skip this check
        const dependenciesInstalled = await checkPythonDependencies();
        if (!dependenciesInstalled) {
            await installPythonDependencies();
        }

        // 3. Start Servers
        const backendProcess = startBackend(backendPort);
        const frontendProcess = startFrontend(frontendPort, backendUrl);

        // 4. Setup Shutdown Handling
        setupGracefulShutdown(backendProcess, frontendProcess);

        console.log('\n✅ Development servers are running!');
        console.log(`📂 Frontend: http://localhost:${frontendPort}`);
        console.log(`🚀 Backend API: ${backendUrl}`);
        console.log('Press Ctrl+C to stop both servers.\n');

    } catch (error) {
        console.error('❌ Error starting services:', error.message);
        process.exit(1);
    }
}

// --- Start the application ---
main();