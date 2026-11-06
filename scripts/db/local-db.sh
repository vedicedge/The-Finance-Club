#!/usr/bin/env bash
# Start a throwaway local Postgres, emulate the Supabase bits we need, apply every migration
# and (if present) the private secret seed. Prints the connection URL on success.
#
#   scripts/db/local-db.sh            # fresh database
#   PGPORT=55432 scripts/db/local-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PGPORT="${PGPORT:-55432}"
DATA="${DOOMSDAY_PGDATA:-$ROOT/.local-db}"
URL="postgresql://postgres@127.0.0.1:${PGPORT}/doomsday"

# Postgres refuses to run as root; use the postgres OS user when we are root.
RUN=()
if [ "$(id -u)" = "0" ]; then RUN=(runuser -u postgres --); fi

if [ -f "$DATA/postmaster.pid" ]; then
  "${RUN[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m fast stop >/dev/null 2>&1 || true
fi
rm -rf "$DATA"
mkdir -p "$DATA"
if [ "$(id -u)" = "0" ]; then chown -R postgres:postgres "$DATA"; fi

"${RUN[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust -E UTF8 >/dev/null
"${RUN[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p ${PGPORT} -k /tmp -c timezone=UTC" -l "$DATA/server.log" -w start >/dev/null

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p "$PGPORT" -U postgres)
"${PSQL[@]}" -d postgres -c "create database doomsday" >/dev/null
"${PSQL[@]}" -d doomsday -f "$ROOT/scripts/db/emulate-supabase.sql" >/dev/null

for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -d doomsday -f "$f" >/dev/null
done

# Supabase's API runs every request under the `safeupdate` guard (UPDATE/DELETE need a WHERE).
# Load our stand-in for the test sessions when it can be built (needs the Postgres server headers).
PGCONFIG="$PGBIN/pg_config"
if [ -f "$("$PGCONFIG" --pkglibdir)/safeupdate.so" ] ||
   { [ -f "$("$PGCONFIG" --includedir-server)/postgres.h" ] &&
     make -s -C "$ROOT/scripts/db/safeupdate" PG_CONFIG="$PGCONFIG" install >/dev/null 2>&1 &&
     make -s -C "$ROOT/scripts/db/safeupdate" clean >/dev/null 2>&1; }; then
  echo "safeupdate guard: on" >&2
  SAFEUPDATE=1
else
  echo "safeupdate guard: off (install the Postgres server headers, e.g. postgresql-server-dev-16, to turn it on)" >&2
  SAFEUPDATE=0
fi

if [ -f "$ROOT/supabase/private/seed_secrets.sql" ]; then
  "${PSQL[@]}" -d doomsday -f "$ROOT/supabase/private/seed_secrets.sql" >/dev/null
  echo "secret seed: loaded" >&2
else
  echo "secret seed: not found (supabase/private/seed_secrets.sql) — tests that need it will be skipped" >&2
fi

# After the migrations and seed (which run in the SQL editor on Supabase, outside the guard).
if [ "$SAFEUPDATE" = "1" ]; then
  "${PSQL[@]}" -d doomsday -c "alter database doomsday set session_preload_libraries = 'safeupdate'" >/dev/null
fi

echo "$URL"
