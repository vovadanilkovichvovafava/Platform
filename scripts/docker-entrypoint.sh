#!/bin/sh
# Container entrypoint: apply database migrations, then hand off to the server.
#
# DB_MIGRATE_MODE controls schema handling on boot:
#   push (default) — sync the schema straight from schema.prisma.
#   deploy         — apply committed migrations from prisma/migrations.
#   none           — skip entirely; schema is managed by a separate job.
#
# WHY push IS THE DEFAULT HERE: prisma/migrations has NO baseline migration —
# nothing in it creates the core tables (User, Trail, ...). The schema has always
# been created with `db push`, and the committed migrations only add incremental
# changes on top. Running `migrate deploy` against an empty database therefore
# fails on the first foreign key that references "User" (error P3009), and the
# recorded failure then blocks every later run.
# Use deploy only once prisma/migrations contains a real baseline.
set -e

MODE="${DB_MIGRATE_MODE:-push}"
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

echo "[entrypoint] Starting application on port ${PORT:-3000}..."
exec "$@"
