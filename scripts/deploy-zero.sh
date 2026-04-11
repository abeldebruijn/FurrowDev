#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ZERO_ENV_FILE:-$ROOT_DIR/.env.prod}"

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. install it first." >&2
  exit 1
fi

if ! railway whoami >/dev/null 2>&1; then
  echo "railway CLI not logged in. run 'railway login' first." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

ZERO_VERSION="${ZERO_VERSION:-1.1.1}"
ZERO_IMAGE="${ZERO_IMAGE:-registry.hub.docker.com/rocicorp/zero:${ZERO_VERSION}}"
ZERO_ADMIN_PASSWORD="${ZERO_ADMIN_PASSWORD:-$(openssl rand -hex 24)}"
RAILWAY_PROJECT="${RAILWAY_PROJECT:-furrow-zero-prod}"
RAILWAY_SERVICE="${RAILWAY_SERVICE:-zero-cache}"
RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
RAILWAY_VOLUME_MOUNT_PATH="${RAILWAY_VOLUME_MOUNT_PATH:-/data}"
ZERO_REPLICA_FILE="${ZERO_REPLICA_FILE:-/data/zero.db}"
ZERO_CVR_DB="${ZERO_CVR_DB:-${DATABASE_URL:-}}"
ZERO_CHANGE_DB="${ZERO_CHANGE_DB:-${DATABASE_URL:-}}"

required_vars=(
  DATABASE_URL
  ZERO_UPSTREAM_DB
  ZERO_CVR_DB
  ZERO_CHANGE_DB
  ZERO_QUERY_URL
  ZERO_MUTATE_URL
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "missing required env var: ${var_name}" >&2
    echo "set it in ${ENV_FILE} or export it before running this script." >&2
    exit 1
  fi
done

if [[ "$ZERO_UPSTREAM_DB" == *"-pooler."* ]]; then
  echo "ZERO_UPSTREAM_DB must use the direct Neon host, not the pooled host." >&2
  exit 1
fi

if ! railway status >/dev/null 2>&1; then
  echo "creating railway project: $RAILWAY_PROJECT"
  railway init -n "$RAILWAY_PROJECT"
fi

if ! railway environment list 2>/dev/null | grep -Fq "$RAILWAY_ENVIRONMENT"; then
  echo "creating railway environment: $RAILWAY_ENVIRONMENT"
  railway environment new "$RAILWAY_ENVIRONMENT"
fi

railway environment link "$RAILWAY_ENVIRONMENT" >/dev/null

if ! railway service status -s "$RAILWAY_SERVICE" >/dev/null 2>&1; then
  echo "creating railway service: $RAILWAY_SERVICE"
  railway add --service "$RAILWAY_SERVICE" --image "$ZERO_IMAGE"
fi

if ! railway volume -s "$RAILWAY_SERVICE" list 2>/dev/null | grep -Fq "$RAILWAY_VOLUME_MOUNT_PATH"; then
  echo "creating railway volume at $RAILWAY_VOLUME_MOUNT_PATH"
  railway volume -s "$RAILWAY_SERVICE" add -m "$RAILWAY_VOLUME_MOUNT_PATH"
fi

echo "setting railway variables"
railway variable set -s "$RAILWAY_SERVICE" --skip-deploys \
  "NODE_ENV=production" \
  "ZERO_UPSTREAM_DB=$ZERO_UPSTREAM_DB" \
  "ZERO_CVR_DB=$ZERO_CVR_DB" \
  "ZERO_CHANGE_DB=$ZERO_CHANGE_DB" \
  "ZERO_QUERY_URL=$ZERO_QUERY_URL" \
  "ZERO_MUTATE_URL=$ZERO_MUTATE_URL" \
  "ZERO_ADMIN_PASSWORD=$ZERO_ADMIN_PASSWORD" \
  "ZERO_REPLICA_FILE=$ZERO_REPLICA_FILE" \
  "ZERO_PORT=4848" \
  "PORT=4848"

domain_output="$(railway domain -s "$RAILWAY_SERVICE" -p 4848 --json 2>/dev/null || railway domain -s "$RAILWAY_SERVICE" -p 4848)"
railway_zero_domain="$(printf '%s' "$domain_output" | grep -Eo '[a-zA-Z0-9.-]+\.up\.railway\.app' | head -n 1 || true)"

echo "redeploying railway service"
railway redeploy -s "$RAILWAY_SERVICE" -y >/dev/null

if [[ -n "$railway_zero_domain" ]]; then
  railway_zero_url="https://${railway_zero_domain}"
  echo "railway zero url: $railway_zero_url"

  node - "$ENV_FILE" "$railway_zero_url" <<'EOF'
const fs = require("node:fs");
const [envFile, zeroUrl] = process.argv.slice(2);
const content = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const nextZero = `NEXT_PUBLIC_ZERO_CACHE_URL=${zeroUrl}`;
const lines = content.split(/\r?\n/);
let replaced = false;
const output = lines.map((line) => {
  if (line.startsWith("NEXT_PUBLIC_ZERO_CACHE_URL=")) {
    replaced = true;
    return nextZero;
  }
  return line;
});
if (!replaced) {
  output.push(nextZero);
}
fs.writeFileSync(envFile, `${output.filter(Boolean).join("\n")}\n`);
EOF
fi

echo "done"
echo "next: update Vercel production env NEXT_PUBLIC_ZERO_CACHE_URL to the Railway URL and redeploy."
