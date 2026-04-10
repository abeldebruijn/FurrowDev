#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

export ZERO_UPSTREAM_DB="${ZERO_UPSTREAM_DB:-${DATABASE_URL:-postgres://postgres:password@localhost:5432/postgres}}"
export ZERO_QUERY_URL="${ZERO_QUERY_URL:-http://localhost:3000/api/zero/query}"
export ZERO_MUTATE_URL="${ZERO_MUTATE_URL:-http://localhost:3000/api/zero/mutate}"
export ZERO_QUERY_FORWARD_COOKIES="${ZERO_QUERY_FORWARD_COOKIES:-true}"
export ZERO_MUTATE_FORWARD_COOKIES="${ZERO_MUTATE_FORWARD_COOKIES:-true}"

echo "starting zero-cache-dev"
echo "ZERO_UPSTREAM_DB=$ZERO_UPSTREAM_DB"
echo "ZERO_QUERY_URL=$ZERO_QUERY_URL"
echo "ZERO_MUTATE_URL=$ZERO_MUTATE_URL"

exec vp exec zero-cache-dev
