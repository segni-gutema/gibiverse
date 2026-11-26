#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "${TURBO_HASH:-}" ] &&
  [ -f "$ROOT_DIR/packages/shared/dist/types/index.js" ] &&
  [ -f "$ROOT_DIR/packages/shared/dist/validation/index.js" ] &&
  [ -f "$ROOT_DIR/packages/shared/dist/utils/index.js" ]; then
  exit 0
fi

pnpm --filter @gibiverse/shared build
