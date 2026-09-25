#!/usr/bin/env bash
# Cloud Agent veya yerel CI: VPS'e SSH ile vps-update.sh çalıştırır.
# Gerekli ortam değişkenleri: VPS_SSH_PRIVATE_KEY
# İsteğe bağlı: VPS_HOST (varsayılan 168.231.109.27), VPS_USER (root), VPS_INSTALL_DIR, VPS_BRANCH
set -euo pipefail

VPS_HOST="${VPS_HOST:-168.231.109.27}"
VPS_USER="${VPS_USER:-root}"
VPS_INSTALL_DIR="${VPS_INSTALL_DIR:-/var/www/nakliyeborsasi}"
VPS_BRANCH="${VPS_BRANCH:-main}"

SSH_BASE_OPTS=(
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=20
)

# Sunucudaki eski vps-update.sh checkout'ta takılabilir; önce ref'i hizala.
REMOTE_CMD="cd '${VPS_INSTALL_DIR}' && git fetch origin '${VPS_BRANCH}' && (git merge --abort 2>/dev/null || true) && git checkout -f '${VPS_BRANCH}' 2>/dev/null || true && git reset --hard 'origin/${VPS_BRANCH}' && git clean -fdx -e .env -e apps/web/.env.local && bash scripts/deploy-posta-lerta-com-tr.sh '${VPS_INSTALL_DIR}'"

echo "=== VPS deploy: ${VPS_USER}@${VPS_HOST} branch=${VPS_BRANCH} ==="

if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  KEY_FILE="$(mktemp)"
  trap 'rm -f "$KEY_FILE"' EXIT
  printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  ssh -i "$KEY_FILE" -o BatchMode=yes "${SSH_BASE_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" "$REMOTE_CMD"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  # BatchMode=yes şifre girişini kapatır; sshpass ile kullanmayın.
  SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh \
    -o PreferredAuthentications=password \
    -o PubkeyAuthentication=no \
    "${SSH_BASE_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" "$REMOTE_CMD"
else
  echo "HATA: VPS_SSH_PRIVATE_KEY veya VPS_SSH_PASSWORD tanımlı değil." >&2
  exit 1
fi
echo "=== Deploy tamam ==="
