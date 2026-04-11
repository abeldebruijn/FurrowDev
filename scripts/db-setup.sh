#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${DB_ENV_FILE:-$ROOT_DIR/.env.prod}"

if ! command -v vp >/dev/null 2>&1; then
  echo "vp CLI not found. install Vite+ first." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export DATABASE_URL="${ZERO_UPSTREAM_DB:-${DATABASE_URL:-}}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "missing database connection string" >&2
  echo "set ZERO_UPSTREAM_DB or DATABASE_URL in ${ENV_FILE} or your shell." >&2
  exit 1
fi

if [[ "$DATABASE_URL" == *"-pooler."* ]]; then
  echo "DATABASE_URL points at a pooled Neon host." >&2
  echo "use the direct host for schema generation and migrations via ZERO_UPSTREAM_DB." >&2
  exit 1
fi

echo "using env file: $ENV_FILE"
echo "using direct database url for migrations"

echo "installing dependencies"
vp install

echo "generating zero schema"
vp run zero:schema

echo "generating drizzle migrations"
vp run db:generate

echo "applying drizzle migrations"
vp run db:migrate

echo "database setup complete"
