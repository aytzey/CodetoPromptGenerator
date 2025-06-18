#!/bin/bash
#
# .codex/setup.sh
# -----------------
# A robust, idempotent setup script for developers.
#
# To run:
#   bash .codex/setup.sh
#

set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting development setup for Code to Prompt Generator..."

# --- 1. Check for NVM and use the correct Node.js version ---
if [ -s "$NVM_DIR/nvm.sh" ]; then
  echo "› Found nvm. Sourcing and using the correct Node.js version from .nvmrc..."
  . "$NVM_DIR/nvm.sh"
  nvm install
  nvm use
else
  echo "› nvm not found. Please ensure you are running Node.js v20 or higher."
  # Optional: Add a hard version check here if needed
  # node -v | grep -q "v20" || { echo "Error: Node.js v20+ is required."; exit 1; }
fi

echo "› Using Node version: $(node -v)"
echo "› Using npm version: $(npm -v)"

# --- 2. Install Node.js dependencies ---
# Using 'npm ci' for a clean, reproducible install from package-lock.json
echo "› Installing Node.js dependencies with 'npm ci'..."
npm ci

# --- 3. Set up Python Virtual Environment ---
# The 'postinstall' script already handles this, but we run it explicitly
# here to ensure it completes and to provide clearer feedback.
echo "› Running post-install script to set up Python environment..."
node scripts/postinstall.js

echo ""
echo "✅ Setup complete!"
echo "You can now run the application in development mode with:"
echo ""
echo "   npm run electron:dev"
echo ""