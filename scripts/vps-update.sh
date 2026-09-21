#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${2:-cursor/modular-freight-platform-18ba}"

cd "$INSTALL_DIR"

echo "=== Git: ${BRANCH} ==="
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "=== Son commit ==="
git log -1 --oneline

if [[ ! -x scripts/build-web.sh ]]; then
  echo "HATA: scripts/build-web.sh yok — branch güncel değil." >&2
  exit 1
fi

bash scripts/restart-api.sh

bash scripts/restart-web.sh "$INSTALL_DIR" 3011 "http://127.0.0.1:3010/api/v1"

echo "=== Bitti ==="
echo "Panel: http://$(hostname -I 2>/dev/null | awk '{print $1}'):3010/panel/"
echo "Web:   http://$(hostname -I 2>/dev/null | awk '{print $1}'):3011"
