#!/usr/bin/env bash
# VPS: main branch — API, app.lerta.com.tr (3011), posta + konsol + vitrin.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$INSTALL_DIR"
echo "=== Production deploy: origin/${BRANCH} ==="
git fetch origin "$BRANCH"
git merge --abort 2>/dev/null || true
git checkout -f "$BRANCH" 2>/dev/null || git checkout -f -B "$BRANCH" "origin/${BRANCH}"
git reset --hard "origin/${BRANCH}"
git clean -fdx -e .env -e apps/web/.env.local -e apps/mail-web/.env.local

git log -1 --oneline

bash scripts/install-deps.sh

if [[ -x scripts/deploy-lerta-post-vanity-from.sh ]]; then
  bash scripts/deploy-lerta-post-vanity-from.sh "$INSTALL_DIR" || true
fi

DEPLOY_BRANCH="$BRANCH" bash scripts/deploy-posta-lerta-com-tr.sh "$INSTALL_DIR"

bash scripts/restart-web.sh "$INSTALL_DIR" 3011 "https://app.lerta.com.tr/api/v1"

if [[ -x scripts/nginx-app-lerta-com-tr.sh ]]; then
  bash scripts/nginx-app-lerta-com-tr.sh || true
fi

echo "=== Production deploy bitti ==="
echo "  app:    https://app.lerta.com.tr/messaging?tab=email"
echo "  posta:  https://posta.lerta.com.tr/login"
