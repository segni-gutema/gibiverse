#!/usr/bin/env bash
set -euo pipefail

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -f "$API_DIR/.env.test" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$API_DIR/.env.test"
  set +a
fi

PG_HOST="localhost"
PG_PORT="${PG_PORT:-5432}"
PG_FALLBACK_PORT="${PG_FALLBACK_PORT:-55432}"
PG_USER="${PG_USER:-postgres}"
PG_PASSWORD="${PG_PASSWORD:-test}"
PG_DATABASE="${PG_DATABASE:-gibiverse}"
PGDATA="${PGDATA:-$API_DIR/.pg-test/data}"
PGLOG="${PGLOG:-$API_DIR/.pg-test/postgres.log}"
PGSOCKET_DIR="${PGSOCKET_DIR:-/tmp/gibiverse-pg-test}"
PGENV_FILE="$API_DIR/.pg-test/env"

resolve_pg_bin() {
  if command -v initdb >/dev/null 2>&1 && command -v pg_ctl >/dev/null 2>&1; then
    dirname "$(command -v pg_ctl)"
    return 0
  fi

  local candidate
  for candidate in $(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -Vr); do
    if [ -x "$candidate/initdb" ] && [ -x "$candidate/pg_ctl" ]; then
      echo "$candidate"
      return 0
    fi
  done

  for candidate in /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin; do
    if [ -x "$candidate/initdb" ] && [ -x "$candidate/pg_ctl" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

PG_BIN="$(resolve_pg_bin || true)"
if [ -z "$PG_BIN" ]; then
  echo "Error: PostgreSQL server binaries (initdb, pg_ctl) not found." >&2
  echo "Install PostgreSQL (e.g., postgresql on Ubuntu/Debian or postgresql@16 on macOS)." >&2
  exit 1
fi

is_port_available() {
  node -e '
    const net = require("net");
    const server = net.createServer();
    server.once("error", () => process.exit(1));
    server.listen(Number(process.argv[1]), "127.0.0.1", () => {
      server.close(() => process.exit(0));
    });
  ' "$1" >/dev/null 2>&1
}

ensure_database() {
  local port="$1"
  if ! PGPASSWORD="$PG_PASSWORD" "$PG_BIN/psql" \
    -h "$PG_HOST" -p "$port" -U "$PG_USER" -d postgres \
    -tAc "SELECT 1 FROM pg_database WHERE datname = '$PG_DATABASE'" | grep -q 1; then
    PGPASSWORD="$PG_PASSWORD" "$PG_BIN/createdb" \
      -h "$PG_HOST" -p "$port" -U "$PG_USER" "$PG_DATABASE"
  fi
}

write_runtime_env() {
  local port="$1"
  mkdir -p "$API_DIR/.pg-test"
  cat > "$PGENV_FILE" <<EOF
PG_PORT=$port
DATABASE_URL=postgresql://$PG_USER:$PG_PASSWORD@$PG_HOST:$port/$PG_DATABASE
EOF
}

cmd_start() {
  local active_port="$PG_PORT"

  if [ -f "$PGDATA/PG_VERSION" ] && "$PG_BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    if [ -f "$PGENV_FILE" ]; then
      # shellcheck disable=SC1090
      . "$PGENV_FILE"
      active_port="$PG_PORT"
    fi
    ensure_database "$active_port"
    write_runtime_env "$active_port"
    echo "PostgreSQL test database is already running on $PG_HOST:$active_port ($PG_DATABASE)."
    return 0
  fi

  if ! is_port_available "$active_port"; then
    echo "Port $active_port is in use; starting isolated test PostgreSQL on port $PG_FALLBACK_PORT."
    active_port="$PG_FALLBACK_PORT"
  fi

  mkdir -p "$API_DIR/.pg-test" "$PGSOCKET_DIR"

  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    local pwfile
    pwfile="$(mktemp)"
    printf '%s\n' "$PG_PASSWORD" > "$pwfile"

    if ! "$PG_BIN/initdb" \
      -D "$PGDATA" \
      -U "$PG_USER" \
      --auth=scram-sha-256 \
      --pwfile="$pwfile" \
      --encoding=UTF8 \
      --locale=C >/dev/null; then
      rm -f "$pwfile"
      return 1
    fi
    rm -f "$pwfile"
  fi

  "$PG_BIN/pg_ctl" \
    -D "$PGDATA" \
    -l "$PGLOG" \
    -o "-h 127.0.0.1 -p $active_port -k $PGSOCKET_DIR" \
    start >/dev/null

  ensure_database "$active_port"
  write_runtime_env "$active_port"
  echo "Started unprivileged PostgreSQL test database on $PG_HOST:$active_port ($PG_DATABASE)."
}

cmd_stop() {
  if [ -f "$PGDATA/postmaster.pid" ]; then
    "$PG_BIN/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null
    echo "Stopped PostgreSQL test database."
  else
    echo "PostgreSQL test database is not running."
  fi
}

cmd_status() {
  local active_port="$PG_PORT"
  if [ -f "$PGENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$PGENV_FILE"
    active_port="$PG_PORT"
  fi
  "$PG_BIN/pg_isready" -h "$PG_HOST" -p "$active_port" -U "$PG_USER" -d "$PG_DATABASE"
}

case "${1:-start}" in
  start)
    cmd_start
    ;;
  stop)
    cmd_stop
    ;;
  status)
    cmd_status
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 1
    ;;
esac
