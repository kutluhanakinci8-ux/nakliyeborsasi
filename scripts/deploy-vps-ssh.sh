#!/usr/bin/env bash
# Cloud Agent veya yerel CI: VPS'e SSH ile vps-update.sh çalıştırır.
# Gerekli ortam değişkenleri: VPS_SSH_PRIVATE_KEY
# İsteğe bağlı: VPS_HOST (varsayılan 168.231.109.27), VPS_USER (root), VPS_INSTALL_DIR, VPS_BRANCH
set -euo pipefail

VPS_HOST="${VPS_HOST:-168.231.109.27}"
VPS_USER="${VPS_USER:-root}"
VPS_INSTALL_DIR="${VPS_INSTALL_DIR:-/var/www/nakliyeborsasi}"
VPS_BRANCH="${VPS_BRANCH:-cursor/modular-freight-platform-18ba}"

if [[ -z "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  echo "HATA: VPS_SSH_PRIVATE_KEY tanımlı değil (Cursor Environment secret veya GitHub Actions)." >&2
  exit 1
fi

KEY_FILE="$(mktemp)"
trap 'rm -f "$KEY_FILE"' EXIT
printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$KEY_FILE"
chmod 600 "$KEY_FILE"

SSH_OPTS=(
  -i "$KEY_FILE"
  -o BatchMode=yes
  -o StrictHostKeyChecking=accept-new
  -o ConnectTimeout=20
)

echo "=== VPS deploy: ${VPS_USER}@${VPS_HOST} branch=${VPS_BRANCH} ==="
ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" \
  "cd '${VPS_INSTALL_DIR}' && bash scripts/vps-update.sh '${VPS_INSTALL_DIR}' '${VPS_BRANCH}'"
echo "=== Deploy tamam ==="
