#!/usr/bin/env bash
# Run the database tests: start a throwaway local Postgres with every migration applied,
# run tests/db against it, then stop it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="${DOOMSDAY_PGDATA:-$ROOT/.local-db}"

URL="$("$ROOT/scripts/db/local-db.sh")"
stop() {
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$PGBIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1 || true
  else "$PGBIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1 || true; fi
}
trap stop EXIT
DOOMSDAY_TEST_DB_URL="$URL" npx vitest run tests/db --no-file-parallelism "$@"
