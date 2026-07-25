#!/usr/bin/env bash
#
# Start the dev server (port 3000). Assumes ./scripts/setup.sh has been run.
#
#   ./scripts/run.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "WARNING: .env.local not found — run ./scripts/setup.sh first." >&2
fi

exec pnpm dev
