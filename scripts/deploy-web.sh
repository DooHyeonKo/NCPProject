#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: sudo bash scripts/deploy-web.sh <WAS_PRIVATE_IP_OR_HOST> [WAS_PORT]

Example:
  sudo bash scripts/deploy-web.sh "10.0.10.7" "8000"

This script deploys only the public WEB tier on Ubuntu 24.04.
Nginx listens on port 80, proxies /api and /health to the WAS tier,
and proxies all other requests to the local Next.js container.
EOF
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage
  exit 1
fi

WAS_HOST="$1"
WAS_PORT="${2:-8000}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-atoz-frontend:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-atoz-frontend}"
LOCAL_FRONTEND_PORT="${LOCAL_FRONTEND_PORT:-3000}"
NGINX_CONF="/etc/nginx/conf.d/atoz-web.conf"

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root: sudo bash scripts/deploy-web.sh ..."
    exit 1
  fi
}

install_packages() {
  echo "[1/9] prevent nginx auto start during install"
  cat > /usr/sbin/policy-rc.d <<'EOF'
#!/bin/sh
exit 101
EOF
  chmod +x /usr/sbin/policy-rc.d

  echo "[2/9] install packages"
  apt-get update -y
  apt-get install -y ca-certificates curl nginx

  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
  fi

  echo "[3/9] normalize nginx default config"
  sed -i '/\[::\]:80/d' /etc/nginx/sites-available/default 2>/dev/null || true
  sed -i '/\[::\]:80/d' /etc/nginx/sites-enabled/default 2>/dev/null || true
  rm -f /etc/nginx/sites-enabled/default
  dpkg --configure -a || true
  rm -f /usr/sbin/policy-rc.d

  systemctl enable --now docker
}

build_image() {
  echo "[4/9] build frontend image"
  docker build \
    -f "$ROOT_DIR/frontend/Dockerfile" \
    --build-arg NEXT_PUBLIC_API_BASE_URL=/api/v1 \
    --build-arg NEXT_PUBLIC_BACKEND_HEALTH_URL=/health \
    -t "$IMAGE_NAME" \
    "$ROOT_DIR/frontend"
}

run_container() {
  echo "[5/9] start frontend container"
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    -e NEXT_PUBLIC_API_BASE_URL=/api/v1 \
    -e NEXT_PUBLIC_BACKEND_HEALTH_URL=/health \
    -p "127.0.0.1:${LOCAL_FRONTEND_PORT}:3000" \
    "$IMAGE_NAME"
}

write_nginx_config() {
  echo "[6/9] write nginx config"
  cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name _;
    client_max_body_size 50m;

    location /api/ {
        proxy_pass http://${WAS_HOST}:${WAS_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_request_buffering off;
    }

    location = /health {
        proxy_pass http://${WAS_HOST}:${WAS_PORT}/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:${LOCAL_FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
}

restart_nginx() {
  echo "[7/9] restart nginx"
  nginx -t
  systemctl enable nginx
  systemctl restart nginx
}

verify_service() {
  echo "[8/9] verify WEB tier"
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1/" >/dev/null; then
      echo "[9/9] WEB deployment completed"
      docker ps --filter "name=${CONTAINER_NAME}"
      systemctl status nginx --no-pager
      return 0
    fi
    sleep 2
  done

  echo "WEB health check failed. Recent frontend logs:"
  docker logs --tail 100 "$CONTAINER_NAME" || true
  exit 1
}

require_root
install_packages
build_image
run_container
write_nginx_config
restart_nginx
verify_service
