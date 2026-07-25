#!/usr/bin/env bash
#
# Bootstrap a fresh checkout / worktree so it can run the app.
# Safe to re-run; each step is idempotent.
#
#   ./scripts/setup.sh
#
# .env.local is gitignored, so fresh worktrees start without it. When run inside
# super.engineering, this links it from the main checkout ($SUPERCONDUCTOR_ROOT_PATH);
# outside that flow, create .env.local manually (see CLAUDE.md for required vars).
#
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
if [ ! -e "$ENV_FILE" ]; then
  ROOT="${SUPERCONDUCTOR_ROOT_PATH:-}"
  if [ -n "$ROOT" ] && [ "$ROOT" != "$PWD" ] && [ -f "$ROOT/$ENV_FILE" ]; then
    ln -sf "$ROOT/$ENV_FILE" "$ENV_FILE"
    echo "→ Linked $ENV_FILE from $ROOT"
  else
    echo "WARNING: $ENV_FILE is missing and no source to link from." >&2
    echo "         Create it manually (see CLAUDE.md for required variables)." >&2
  fi
fi

echo "→ Installing dependencies (pnpm install)"
pnpm install

# postinstall already runs `prisma generate`; sync the schema to the database.
echo "→ Syncing Prisma schema (pnpm db:push)"
pnpm db:push

echo "✓ Setup complete. Start the app with ./scripts/run.sh (or pnpm dev)."
