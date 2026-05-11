#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: sudo bash scripts/deploy-was.sh <DB_HOST> <DB_PORT> <DB_NAME> <DB_USER> <WEB_ORIGIN> [BUCKET]

Example:
  sudo bash scripts/deploy-was.sh "10.0.40.6" "5432" "postgres" "postgres" "http://WEB_PUBLIC_IP" "atoz-upload-bucket"

This script deploys only the FastAPI WAS tier on Ubuntu 24.04.
It prompts for secrets and writes them to /etc/atoz1/backend.env with 600 permissions.
EOF
}

if [[ $# -lt 5 || $# -gt 6 ]]; then
  usage
  exit 1
fi

DB_HOST="$1"
DB_PORT="$2"
DB_NAME="$3"
DB_USER="$4"
WEB_ORIGIN="$5"
BUCKET="${6:-atoz-upload-bucket}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ENV_DIR:-/etc/atoz1}"
ENV_FILE="${ENV_DIR}/backend.env"
IMAGE_NAME="${IMAGE_NAME:-atoz-backend:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-atoz-backend}"
HOST_PORT="${HOST_PORT:-8000}"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root: sudo bash scripts/deploy-was.sh ..."
    exit 1
  fi
}

prompt_secret() {
  local var_name="$1"
  local label="$2"
  local value="${!var_name:-}"

  if [[ -z "$value" ]]; then
    read -r -s -p "${label}: " value
    echo
  fi

  if [[ -z "$value" ]]; then
    echo "${label} is required."
    exit 1
  fi

  printf -v "$var_name" '%s' "$value"
}

urlencode() {
  python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$1"
}

install_packages() {
  echo "[1/7] install packages"
  apt-get update -y
  apt-get install -y ca-certificates curl python3

  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
  fi

  systemctl enable --now docker
}

write_env() {
  echo "[2/7] write WAS environment"
  prompt_secret DB_PASSWORD "Enter DB password"
  prompt_secret JWT_SECRET_KEY "Enter JWT secret key"
  prompt_secret CLOVA_STUDIO_API_KEY "Enter CLOVA Studio API key"
  prompt_secret NCP_OBJECT_STORAGE_ACCESS_KEY "Enter NCP Object Storage access key"
  prompt_secret NCP_OBJECT_STORAGE_SECRET_KEY "Enter NCP Object Storage secret key"

  local encoded_password
  encoded_password="$(urlencode "$DB_PASSWORD")"

  install -d -m 700 "$ENV_DIR"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql+psycopg://${DB_USER}:${encoded_password}@${DB_HOST}:${DB_PORT}/${DB_NAME}
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=14
CLOVA_STUDIO_API_KEY=${CLOVA_STUDIO_API_KEY}
CLOVA_STUDIO_BASE_URL=https://clovastudio.stream.ntruss.com/v1/openai
CLOVA_CHAT_MODEL=HCX-005
CLOVA_EMBEDDING_MODEL=bge-m3
MAX_UPLOAD_SIZE_MB=40
FRONTEND_ORIGIN=${WEB_ORIGIN}
NCP_OBJECT_STORAGE_ENDPOINT=https://kr.object.ncloudstorage.com
NCP_OBJECT_STORAGE_REGION=kr-standard
NCP_OBJECT_STORAGE_ACCESS_KEY=${NCP_OBJECT_STORAGE_ACCESS_KEY}
NCP_OBJECT_STORAGE_SECRET_KEY=${NCP_OBJECT_STORAGE_SECRET_KEY}
NCP_OBJECT_STORAGE_BUCKET=${BUCKET}
EOF
  chmod 600 "$ENV_FILE"
}

build_image() {
  echo "[3/7] build backend image"
  docker build -f "$ROOT_DIR/backend/Dockerfile" -t "$IMAGE_NAME" "$ROOT_DIR/backend"
}

run_container() {
  echo "[4/7] start backend container"
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    --env-file "$ENV_FILE" \
    -p "${HOST_PORT}:8000" \
    "$IMAGE_NAME"
}

verify_service() {
  echo "[5/7] wait for health check"
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${HOST_PORT}/health" >/dev/null; then
      echo "[6/7] backend health check passed"
      docker ps --filter "name=${CONTAINER_NAME}"
      echo "[7/7] WAS deployment completed"
      return 0
    fi
    sleep 2
  done

  echo "Backend health check failed. Recent logs:"
  docker logs --tail 100 "$CONTAINER_NAME" || true
  exit 1
}

require_root
install_packages
write_env
build_image
run_container
verify_service
