#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# start.sh — Development startup script for Code-to-Prompt (Tauri)
#
# This script now simply reminds the user of the correct Tauri command.
# Tauri's dev command handles starting the frontend dev server and the
# Tauri application shell, which in turn manages the Python backend.
# ---------------------------------------------------------------------------
set -euo pipefail

echo "🚀 To start Code-to-Prompt Generator in development mode, run:"
echo ""
echo "   npm run electron:dev
echo ""
echo "This will:"
echo "  1. Start the Next.js development server (via 'npm run dev')."
echo "  2. Launch the Tauri application window."
echo "  3. The Tauri app will start the Python backend process."
echo ""

# Optional: You could add a check here to see if dependencies are installed
# if [ ! -d "node_modules" ] || [ ! -d "src-tauri/target" ]; then
#   echo "⚠️ Dependencies might not be installed. Run 'npm install' first."
# fi

exit 0