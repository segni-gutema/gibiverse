#!/usr/bin/env bash
set -euo pipefail

API_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$API_DIR"

if [ -f "$API_DIR/.env.test" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$API_DIR/.env.test"
  set +a
fi

"$API_DIR/scripts/test-db.sh" start

if [ -f "$API_DIR/.pg-test/env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$API_DIR/.pg-test/env"
  set +a
fi

pnpm --filter @gibiverse/shared build
pnpm exec drizzle-kit migrate
pnpm test "$@"
