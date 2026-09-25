#!/usr/bin/env bash
# posta.lerta.com.tr — mail-web + API (diğer PM2 süreçlerine dokunmaz).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$INSTALL_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

bash "$INSTALL_DIR/scripts/restart-api.sh" "$INSTALL_DIR"
bash "$INSTALL_DIR/scripts/restart-mail-web.sh" "$INSTALL_DIR" 3012 "https://posta.lerta.com.tr/api/v1"
bash "$INSTALL_DIR/scripts/restart-mail-console.sh" "$INSTALL_DIR" 3013 "https://yonetim.lerta.com.tr/api/v1"
bash "$INSTALL_DIR/scripts/nginx-posta-lerta-com-tr.sh"
bash "$INSTALL_DIR/scripts/nginx-yonetim-lerta-com-tr.sh"

if [[ -f "$INSTALL_DIR/scripts/audit-nginx-posta-isolation.sh" ]]; then
  bash "$INSTALL_DIR/scripts/audit-nginx-posta-isolation.sh"
fi

echo "Deploy tamam: https://posta.lerta.com.tr/login"
