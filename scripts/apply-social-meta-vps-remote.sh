#!/usr/bin/env bash
# Yerelden (Cloud Agent) VPS .env: SOCIAL_META_APP_ID + SECRET güncelle.
#
#   SOCIAL_META_APP_ID=2221714798689450 SOCIAL_META_APP_SECRET='...' \
#     bash scripts/apply-social-meta-vps-remote.sh
#
# Secret'ı sohbete yazmayın — Cursor ortam secret veya yerel export kullanın.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VPS_HOST="${VPS_HOST:-168.231.109.27}"
VPS_USER="${VPS_USER:-root}"
INSTALL_DIR="${VPS_INSTALL_DIR:-/var/www/nakliyeborsasi}"

APP_ID="${SOCIAL_META_APP_ID:-2221714798689450}"
APP_SECRET="${SOCIAL_META_APP_SECRET:-}"

if [[ -z "${VPS_SSH_PASSWORD:-}" ]]; then
  echo "HATA: VPS_SSH_PASSWORD gerekli." >&2
  exit 1
fi
if [[ -z "${APP_SECRET}" ]]; then
  echo "HATA: SOCIAL_META_APP_SECRET gerekli (Meta → Temel → Uygulama gizli anahtarı)." >&2
  exit 1
fi

SSH_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o PreferredAuthentications=password
  -o PubkeyAuthentication=no
)

echo "==> Script kopyalanıyor: ${VPS_USER}@${VPS_HOST}:${INSTALL_DIR}/scripts/"
SSHPASS="$VPS_SSH_PASSWORD" sshpass -e scp "${SSH_OPTS[@]}" \
  "${ROOT}/scripts/apply-social-meta-vps-env.sh" \
  "${VPS_USER}@${VPS_HOST}:${INSTALL_DIR}/scripts/apply-social-meta-vps-env.sh"

echo "==> Meta env uygulanıyor (app id ${APP_ID})"
SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh "${SSH_OPTS[@]}" \
  "${VPS_USER}@${VPS_HOST}" \
  "cd '${INSTALL_DIR}' && SOCIAL_META_APP_ID='${APP_ID}' SOCIAL_META_APP_SECRET='${APP_SECRET}' bash scripts/apply-social-meta-vps-env.sh '${INSTALL_DIR}'"

echo "==> OAuth hazırlık kontrolü (integration gate — secret gösterilmez)"
SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh "${SSH_OPTS[@]}" \
  "${VPS_USER}@${VPS_HOST}" \
  "grep '^SOCIAL_META_APP_ID=' '${INSTALL_DIR}/.env' | cut -d= -f1- | head -1"

curl -fsS "https://app.lerta.com.tr/api/v1/company/social-hub/integration-gate" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('metaOAuthReady=', d.get('metaOAuthReady')); print('detail=', (d.get('checks') or {}).get('metaOAuth',{}).get('detail','')[:120])" \
  2>/dev/null || echo "UYARI: integration-gate curl başarısız (oturum gerekebilir)"

echo "Tamam."
