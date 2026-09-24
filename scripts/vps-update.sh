#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${2:-cursor/own-mail-platform-519e}"

cd "$INSTALL_DIR"

echo "=== Git: origin/${BRANCH} (yerel değişiklikler sıfırlanır) ==="
git fetch origin "$BRANCH"
# Önce working tree'i boşalt; checkout bazen package-lock.json ile takılır.
git merge --abort 2>/dev/null || true
git reset --hard HEAD 2>/dev/null || true
git clean -fdx -e .env -e apps/web/.env.local
git checkout -f -B "$BRANCH" "origin/${BRANCH}" || {
  echo "checkout başarısız — ref üzerinden zorla hizalanıyor"
  git fetch origin "$BRANCH"
  git branch -f "$BRANCH" "origin/${BRANCH}"
  git checkout -f "$BRANCH"
}
git reset --hard "origin/${BRANCH}"
git clean -fdx -e .env -e apps/web/.env.local

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
