#!/usr/bin/env bash
# Private PostgreSQL cluster for local development and tests (never Supabase, never production).
# Data lives in .local/pg (gitignored); trust auth on a unix socket + 127.0.0.1 only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.local/pg"
SOCK="$ROOT/.local/pg-sock"
LOG="$ROOT/.local/pg.log"
PORT="${ALSTORE_PG_PORT:-54329}"

case "${1:-}" in
  init)
    if [ -d "$DATA" ]; then echo "already initialised: $DATA"; exit 0; fi
    mkdir -p "$SOCK"
    initdb --pgdata="$DATA" --username=postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
    echo "initialised $DATA"
    ;;
  start)
    mkdir -p "$SOCK"
    pg_ctl --pgdata="$DATA" --log="$LOG" --wait \
      -o "-p $PORT -k $SOCK -c listen_addresses=127.0.0.1 -c timezone=UTC" start
    for db in alstore_dev alstore_test; do
      psql -h 127.0.0.1 -p "$PORT" -U postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 \
        || createdb -h 127.0.0.1 -p "$PORT" -U postgres "$db"
    done
    echo "postgres running on 127.0.0.1:$PORT (databases: alstore_dev, alstore_test)"
    ;;
  stop)
    pg_ctl --pgdata="$DATA" --wait stop
    ;;
  status)
    pg_ctl --pgdata="$DATA" status
    ;;
  *)
    echo "usage: scripts/db-local.sh init|start|stop|status" >&2
    exit 2
    ;;
esac
