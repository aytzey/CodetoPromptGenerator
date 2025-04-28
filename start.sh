#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# start.sh — Kick-off script for Code-to-Prompt Generator Tool
#
# 1. Prints a friendly banner.
# 2. Terminates any running “next dev” processes to avoid EADDRINUSE on 3010.
#    • Uses pkill on Linux & modern macOS (>=10.8)          [preferred]
#    • Falls back to killall -m (macOS regex)               [secondary]
#    • Final fallback: frees port 3010 via lsof -> kill      [last resort]
# 3. Launches the Node bootstrap script (start.js).
#
# Exit codes:
#   0  — Success.
#   10 — Couldn’t find a suitable “kill” command.
#   20 — Failed to free port 3010.
#   *  — Propagates Node’s exit code.
# ---------------------------------------------------------------------------

set -euo pipefail

PORT=3010
PATTERN="next dev"

echo "🚀  Starting Code-to-Prompt Generator Tool..."

###############################################################################
# Step 1 — Clear any existing Next.js dev servers
###############################################################################
if command -v pkill >/dev/null 2>&1; then
  pkill -f "$PATTERN" 2>/dev/null || true
elif command -v killall >/dev/null 2>&1; then
  # BSD killall supports -m for regex matching
  killall -m "$PATTERN" 2>/dev/null || true
else
  echo "⚠️  Neither pkill nor killall found — falling back to port purge."
  if command -v lsof >/dev/null 2>&1; then
    # shellcheck disable=SC2046  # intentional word splitting for PID list
    kill $(lsof -ti tcp:"$PORT") 2>/dev/null || true
  else
    echo "❌ Cannot free port $PORT (no pkill, killall, or lsof)."
    exit 10
  fi
fi

# Confirm the port is really free; bail out if not.
if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "❌ Port $PORT is still in use. Aborting."
  exit 20
fi

###############################################################################
# Step 2 — Boot the application
###############################################################################
node start.js
exit $?

