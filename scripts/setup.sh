#!/usr/bin/env bash
#
# Bootstrap a fresh checkout / worktree so it can run the app.
# Safe to re-run; each step is idempotent.
#
#   ./scripts/setup.sh
#
# .env.local is gitignored. In super.engineering, enable the "symlink env files"
# settings toggle so it is linked into each new worktree automatically. Outside
# that flow, create .env.local manually (see CLAUDE.md for required variables).
#
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "WARNING: .env.local is missing." >&2
  echo "         Enable super.engineering's env-symlink toggle in settings, or" >&2
  echo "         create .env.local manually (see CLAUDE.md for required vars)." >&2
fi

echo "→ Installing dependencies (pnpm install)"
pnpm install

# postinstall already runs `prisma generate`; sync the schema to the database.
echo "→ Syncing Prisma schema (pnpm db:push)"
pnpm db:push

echo "✓ Setup complete. Start the app with ./scripts/run.sh (or pnpm dev)."
