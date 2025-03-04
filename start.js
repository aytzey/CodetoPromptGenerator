// start.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const BACKEND_DIR = path.join(__dirname, 'python_backend');
const PYTHON_COMMAND = os.platform() === 'win32' ? 'python' : 'python3';
const BACKEND_SCRIPT = 'app.py';
const FRONTEND_COMMAND = 'npm';
const FRONTEND_ARGS = ['run', 'dev'];

console.log('Starting Code to Prompt Generator Tool...');

// Check if virtual environment exists and activate if needed
const hasVenv = fs.existsSync(path.join(BACKEND_DIR, 'venv')) || 
                fs.existsSync(path.join(BACKEND_DIR, '.venv'));

// Function to detect if Python dependencies are installed
async function checkPythonDependencies() {
  return new Promise((resolve) => {
    const pip = spawn(PYTHON_COMMAND, ['-m', 'pip', 'freeze'], {
      cwd: BACKEND_DIR,
      shell: true
    });
    
    let output = '';
    pip.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pip.on('close', (code) => {
      if (code !== 0) {
        resolve(false);
        return;
      }
      
      // Check if Flask is in the output
      const hasFlask = output.includes('Flask==') || output.includes('Flask>=');
      resolve(hasFlask);
    });
  });
}

// Function to install Python dependencies
async function installPythonDependencies() {
  console.log('Installing Python dependencies...');
  
  return new Promise((resolve, reject) => {
    const pip = spawn(PYTHON_COMMAND, ['-m', 'pip', 'install', '-r', 'requirements.txt'], {
      cwd: BACKEND_DIR,
      shell: true,
      stdio: 'inherit'
    });
    
    pip.on('close', (code) => {
      if (code === 0) {
        console.log('Python dependencies installed successfully');
        resolve();
      } else {
        reject(new Error(`Failed to install Python dependencies (exit code: ${code})`));
      }
    });
  });
}

// Function to start the backend server
function startBackend() {
  console.log(`Starting backend server from ${BACKEND_DIR}...`);
  
  const backend = spawn(PYTHON_COMMAND, [BACKEND_SCRIPT], {
    cwd: BACKEND_DIR,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, FLASK_DEBUG: 'True' }
  });
  
  backend.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Backend server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  return backend;
}

// Function to start the frontend server
function startFrontend() {
  console.log('Starting frontend server...');
  
  const frontend = spawn(FRONTEND_COMMAND, FRONTEND_ARGS, {
    cwd: __dirname,
    shell: true,
    stdio: 'inherit'
  });
  
  frontend.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Frontend server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  return frontend;
}

// Setup graceful shutdown
function setupGracefulShutdown(backend, frontend) {
  const shutdown = () => {
    console.log('\nShutting down servers...');
    
    // Kill processes
    if (os.platform() === 'win32') {
      spawn('taskkill', ['/pid', backend.pid, '/f', '/t']);
      spawn('taskkill', ['/pid', frontend.pid, '/f', '/t']);
    } else {
      backend.kill('SIGINT');
      frontend.kill('SIGINT');
    }
    
    // Give processes time to clean up
    setTimeout(() => {
      console.log('Shutdown complete');
      process.exit(0);
    }, 1000);
  };
  
  // Handle various termination signals
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);
  
  // Handle Windows Ctrl+C
  if (os.platform() === 'win32') {
    process.on('SIGBREAK', shutdown);
  }
}

// Main function to start everything
async function main() {
  try {
    // Check and install Python dependencies if needed
    const dependenciesInstalled = await checkPythonDependencies();
    if (!dependenciesInstalled) {
      await installPythonDependencies();
    }
    
    // Start backend first, then frontend
    const backend = startBackend();
    const frontend = startFrontend();
    
    // Setup graceful shutdown handlers
    setupGracefulShutdown(backend, frontend);
    
    console.log('\n✅ Development servers are running!');
    console.log('📂 Frontend: http://localhost:3000');
    console.log('🚀 Backend: http://localhost:5000');
    console.log('Press Ctrl+C to stop both servers\n');
    
  } catch (error) {
    console.error('Error starting services:', error.message);
    process.exit(1);
  }
}

// Start the application
main();