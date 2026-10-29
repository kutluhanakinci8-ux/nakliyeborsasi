#!/usr/bin/env bash
# WinLRT vitrin — yalnızca www.lerta.com.tr (mail-marketing :3014).
# API, posta, mesaj, u88 restart EDİLMEZ.
#
# VPS:
#   VPS_SSH_PASSWORD=… bash scripts/deploy-winlrt-vitrin-only.sh
# Yerel (repo zaten güncel):
#   bash scripts/deploy-winlrt-vitrin-only.sh --local /var/www/nakliyeborsasi
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VPS_HOST="${VPS_HOST:-168.231.109.27}"
VPS_USER="${VPS_USER:-root}"
VPS_INSTALL_DIR="${VPS_INSTALL_DIR:-/var/www/nakliyeborsasi}"
VPS_BRANCH="${VPS_BRANCH:-main}"
WEB_PORT="${WEB_PORT:-3014}"

REMOTE_VITRIN="
set -euo pipefail
cd '${VPS_INSTALL_DIR}'
echo '=== WinLRT vitrin-only: git ${VPS_BRANCH} ==='
git fetch origin '${VPS_BRANCH}'
git merge --abort 2>/dev/null || true
git checkout -f '${VPS_BRANCH}' 2>/dev/null || true
git reset --hard 'origin/${VPS_BRANCH}'
git clean -fdx -e .env -e apps/web/.env.local -e apps/mail-web/.env.local -e apps/mail-marketing/.env.local
git log -1 --oneline
echo '=== WinLRT vitrin-only: mail-marketing build + pm2 ==='
bash scripts/restart-mail-marketing.sh '${VPS_INSTALL_DIR}' '${WEB_PORT}'
echo '=== WinLRT vitrin-only: smoke ==='
curl -sf -o /dev/null -w 'yazilim-indir HTTP %{http_code}\n' 'http://127.0.0.1:${WEB_PORT}/destek/yazilim-indir' || exit 1
"

run_local() {
  local dir="${1:-$VPS_INSTALL_DIR}"
  cd "$dir"
  bash scripts/restart-mail-marketing.sh "$dir" "$WEB_PORT"
  curl -sf -o /dev/null -w "yazilim-indir HTTP %{http_code}\n" \
    "http://127.0.0.1:${WEB_PORT}/destek/yazilim-indir"
}

if [[ "${1:-}" == "--local" ]]; then
  run_local "${2:-$VPS_INSTALL_DIR}"
  exit 0
fi

SSH_BASE_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=30)

if [[ -n "${VPS_SSH_PRIVATE_KEY:-}" ]]; then
  KEY_FILE="$(mktemp)"
  trap 'rm -f "$KEY_FILE"' EXIT
  printf '%s\n' "$VPS_SSH_PRIVATE_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  ssh -i "$KEY_FILE" -o BatchMode=yes "${SSH_BASE_OPTS[@]}" \
    "${VPS_USER}@${VPS_HOST}" "$REMOTE_VITRIN"
elif [[ -n "${VPS_SSH_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  SSHPASS="$VPS_SSH_PASSWORD" sshpass -e ssh \
    -o PreferredAuthentications=password \
    -o PubkeyAuthentication=no \
    "${SSH_BASE_OPTS[@]}" "${VPS_USER}@${VPS_HOST}" "$REMOTE_VITRIN"
else
  echo "HATA: VPS_SSH_PRIVATE_KEY veya VPS_SSH_PASSWORD gerekli." >&2
  exit 1
fi

echo "=== WinLRT vitrin deploy tamam (${VPS_HOST}:${WEB_PORT}) ==="
