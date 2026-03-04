#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH." >&2
  exit 1
fi

WEB_PORT="3010"
BACKEND_PORT="${BACKEND_PORT:-${FLASK_PORT:-5010}}"
SKIP_PORT_CLEANUP="${SKIP_PORT_CLEANUP:-0}"

port_pids() {
  local port="$1"
  local lines=""

  if command -v ss >/dev/null 2>&1; then
    lines="$(ss -ltnpH "( sport = :${port} )" 2>/dev/null || true)"
    if [[ -n "$lines" ]]; then
      printf '%s\n' "$lines" | grep -oE 'pid=[0-9]+' | cut -d= -f2
    fi
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$port" 2>/dev/null | tr ' ' '\n' | sed '/^$/d'
  fi
}

kill_pids_gracefully() {
  local pids=("$@")
  [[ "${#pids[@]}" -eq 0 ]] && return 0

  kill -TERM "${pids[@]}" 2>/dev/null || true
  sleep 0.4

  local still_running=()
  local pid
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      still_running+=("$pid")
    fi
  done

  if [[ "${#still_running[@]}" -gt 0 ]]; then
    kill -KILL "${still_running[@]}" 2>/dev/null || true
  fi
}

kill_ports() {
  if [[ "$SKIP_PORT_CLEANUP" == "1" ]]; then
    return 0
  fi

  local ports=("$@")
  local local_killer="./node_modules/.bin/kill-port"
  local port

  for port in "${ports[@]}"; do
    mapfile -t pids < <(port_pids "$port" | sort -u)
    if [[ "${#pids[@]}" -gt 0 ]]; then
      kill_pids_gracefully "${pids[@]}"
    fi
  done

  if [[ -x "$local_killer" ]]; then
    "$local_killer" "${ports[@]}" >/dev/null 2>&1 || true
  else
    npx --yes kill-port "${ports[@]}" >/dev/null 2>&1 || true
  fi
}

usage() {
  cat <<'EOF'
Usage: ./start.sh [mode]

Modes:
  dev      Start Electron in development mode
  web      Start only Next.js dev server
  backend  Start only Python backend wrapper
  prod     Start local production simulation (default)
  prod-build  Rebuild frontend then start local production simulation

Examples:
  ./start.sh
  ./start.sh dev
  ./start.sh web
  ./start.sh backend
  ./start.sh prod
  ./start.sh prod-build

Environment:
  BACKEND_PORT       Override backend port (default: 5010)
  FLASK_PORT         Alternate backend port source
  SKIP_PORT_CLEANUP  Set to 1 to disable automatic port cleanup
  FORCE_BUILD        Set to 1 to force rebuild in prod mode
EOF
}

MODE="${1:-prod}"

ensure_prod_assets() {
  if [[ "${FORCE_BUILD:-0}" == "1" ]]; then
    npm run build
    return 0
  fi

  if [[ ! -f "out/index.html" ]]; then
    echo "[start.sh] Static export not found (out/index.html). Running build once..."
    npm run build
  fi
}

case "$MODE" in
  dev)
    kill_ports "$WEB_PORT" "$BACKEND_PORT"
    exec npm run electron:dev
    ;;
  web)
    kill_ports "$WEB_PORT"
    exec npm run dev
    ;;
  backend)
    kill_ports "$BACKEND_PORT"
    exec npm run backend
    ;;
  prod)
    kill_ports "$WEB_PORT" "$BACKEND_PORT"
    ensure_prod_assets
    exec npm run electron:prod:local:nobuild
    ;;
  prod-build)
    kill_ports "$WEB_PORT" "$BACKEND_PORT"
    exec npm run electron:prod:local
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    usage
    exit 1
    ;;
esac
