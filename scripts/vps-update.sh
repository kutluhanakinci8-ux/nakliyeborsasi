#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${2:-cursor/modular-freight-platform-18ba}"

cd "$INSTALL_DIR"

echo "=== Git: origin/${BRANCH} (yerel değişiklikler sıfırlanır) ==="
git fetch origin "$BRANCH"
git checkout -f -B "$BRANCH" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"
git clean -fdx

echo "=== Son commit ==="
git log -1 --oneline
echo "Not: Tasarım galerisi /ui-ornekleri bu commit ile gelir (b584630 ve sonrası)."

if [[ ! -x scripts/build-web.sh ]]; then
  echo "HATA: scripts/build-web.sh yok." >&2
  exit 1
fi

bash scripts/install-deps.sh

bash scripts/restart-api.sh

bash scripts/restart-web.sh "$INSTALL_DIR" 3011

SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo "=== Bitti ==="
echo "Panel: http://${SERVER_IP}:3010/panel/"
echo "Web:   http://${SERVER_IP}:3011"
