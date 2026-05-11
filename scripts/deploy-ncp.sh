#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT_DIR/.env.example" "$ENV_FILE"
  echo "Created .env from .env.example. Edit .env first, then rerun this script."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

required_vars=(
  DATABASE_URL
  JWT_SECRET_KEY
  FRONTEND_ORIGIN
  NEXT_PUBLIC_API_BASE_URL
  NEXT_PUBLIC_BACKEND_HEALTH_URL
  NCP_OBJECT_STORAGE_ACCESS_KEY
  NCP_OBJECT_STORAGE_SECRET_KEY
  NCP_OBJECT_STORAGE_BUCKET
)

missing=()
for var_name in "${required_vars[@]}"; do
  value="${!var_name:-}"
  if [[ -z "$value" || "$value" == replace-* || "$value" == *YOUR_SERVER_PUBLIC_IP* ]]; then
    missing+=("$var_name")
  fi
done

if (( ${#missing[@]} > 0 )); then
  printf 'Missing or placeholder environment variables:\n'
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

cd "$ROOT_DIR"
docker compose pull --ignore-pull-failures
docker compose up -d --build
docker compose ps
