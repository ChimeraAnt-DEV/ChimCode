#!/usr/bin/env bash
# ChimCode launcher. Creates a virtualenv, installs deps, starts the server.
set -euo pipefail
cd "$(dirname "$0")/server"

PYTHON="${PYTHON:-python3}"
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  "$PYTHON" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

export CHIMCODE_SECRET_KEY="${CHIMCODE_SECRET_KEY:-$(python -c 'import secrets;print(secrets.token_urlsafe(48))')}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-12000}"
echo "ChimCode running at http://${HOST}:${PORT}"
exec python -m uvicorn app.main:app --host "$HOST" --port "$PORT"
