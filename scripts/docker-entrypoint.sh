#!/bin/sh
# Container entrypoint: apply database migrations, then hand off to the server.
#
# DB_MIGRATE_MODE controls schema handling on boot:
#   deploy (default) — apply committed migrations from prisma/migrations. Safe for
#                      production: never drops data, fails loudly on drift.
#   push             — sync schema directly from schema.prisma (no migration history).
#                      Use only for throwaway environments.
#   none             — skip entirely; migrations are run by a separate job.
set -e

MODE="${DB_MIGRATE_MODE:-deploy}"
# Invoke the CLI by its real path — node_modules/.bin/prisma is a symlink, and a
# dereferenced copy of it cannot locate its own .wasm assets.
PRISMA="node ./node_modules/prisma/build/index.js"

if [ -z "$DATABASE_URL" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  exit 1
fi

case "$MODE" in
  deploy)
    echo "[entrypoint] Applying migrations (prisma migrate deploy)..."
    # Unquoted on purpose: $PRISMA expands to two words (node + script path).
    # shellcheck disable=SC2086
    $PRISMA migrate deploy
    ;;
  push)
    echo "[entrypoint] Syncing schema (prisma db push)..."
    # Deliberately WITHOUT --accept-data-loss: a destructive change must fail
    # rather than silently drop columns.
    # shellcheck disable=SC2086
    $PRISMA db push --skip-generate
    ;;
  none)
    echo "[entrypoint] DB_MIGRATE_MODE=none — skipping schema step."
    ;;
  *)
    echo "FATAL: unknown DB_MIGRATE_MODE='$MODE' (expected deploy|push|none)." >&2
    exit 1
    ;;
esac

echo "[entrypoint] Starting application on port ${PORT:-8080}..."
exec "$@"
