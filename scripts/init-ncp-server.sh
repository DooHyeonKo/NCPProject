#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/atoz1}"
APP_REPO="${APP_REPO:-}"
APP_USER="${APP_USER:-${SUDO_USER:-ubuntu}}"
SSH_PORTS="${SSH_PORTS:-22 2200}"

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

configure_ssh_ports() {
  echo "[1/5] configure SSH ports: ${SSH_PORTS}"

  mkdir -p /etc/systemd/system/ssh.socket.d
  {
    echo "[Socket]"
    echo "ListenStream="
    for port in ${SSH_PORTS}; do
      echo "ListenStream=${port}"
    done
  } > /etc/systemd/system/ssh.socket.d/override.conf

  sed -i '/^Port /d' /etc/ssh/sshd_config
  for port in ${SSH_PORTS}; do
    sed -i "1i Port ${port}" /etc/ssh/sshd_config
  done

  if command -v sshd >/dev/null 2>&1; then
    sshd -t
  elif [[ -x /usr/sbin/sshd ]]; then
    /usr/sbin/sshd -t
  fi

  systemctl daemon-reload
  systemctl restart ssh.socket 2>/dev/null || true
  systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || true
}

install_packages() {
  echo "[2/5] install base packages"
  apt-get update -y
  apt-get install -y ca-certificates curl git openssh-server

  if ! command -v docker >/dev/null 2>&1; then
    echo "[3/5] install Docker"
    curl -fsSL https://get.docker.com | sh
  else
    echo "[3/5] Docker already installed"
  fi

  systemctl enable --now docker
  usermod -aG docker "$APP_USER" || true
}

prepare_app_dir() {
  echo "[4/5] prepare application directory"
  mkdir -p "$APP_DIR"
  chown "$APP_USER":"$APP_USER" "$APP_DIR"

  if [[ -n "$APP_REPO" && ! -d "$APP_DIR/.git" ]]; then
    sudo -u "$APP_USER" git clone "$APP_REPO" "$APP_DIR"
  fi
}

print_next_steps() {
  echo "[5/5] NCP server bootstrap completed"
  cat <<EOF

SSH is configured for ports: ${SSH_PORTS}
Application directory: ${APP_DIR}
Application user: ${APP_USER}

Next steps for split 3-tier deployment:
1. Clone or pull the repository in ${APP_DIR}.
2. On the WAS server:
   sudo bash scripts/deploy-was.sh "PRIVATE_CDB_ENDPOINT" "5432" "DB_NAME" "DB_USER" "http://WEB_PUBLIC_IP" "atoz-upload-bucket"
3. On the WEB server:
   sudo bash scripts/deploy-web.sh "WAS_PRIVATE_IP" "8000"

Single-server Docker Compose option:
1. cd ${APP_DIR}
2. cp .env.example .env
3. Edit .env with NCP Cloud DB, Object Storage, CLOVA, and public server URLs.
4. ./scripts/deploy-ncp.sh

If Docker permission is denied for ${APP_USER}, log out and log back in.
EOF
}

configure_ssh_ports
install_packages
prepare_app_dir
print_next_steps
