#!/usr/bin/env bash
# www → Lerta Mail vitrin (DNS hazır olduğunda). U88'yi önce u88.lerta.com.tr'ye taşıyın.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
EXPECTED_IP="${EXPECTED_IP:-168.231.109.27}"
CONFIRM="${CONFIRM_CUTOVER:-}"
BACKUP_DIR="${NGINX_BACKUP_DIR:-/etc/nginx/sites-available/backups-lerta-mail-cutover}"
REDIRECT_KURUMSAL="${REDIRECT_KURUMSAL:-yes}"

if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Cutover için: CONFIRM_CUTOVER=yes bash $0" >&2
  echo "Önce docs/WWW_CUTOVER_LERTA_MAIL.md ve U88 taşıması." >&2
  exit 1
fi

WWW_IP="$(dig +short www.lerta.com.tr A | head -1 || true)"
if [[ "${WWW_IP}" != "${EXPECTED_IP}" ]]; then
  echo "DNS hazır değil: www.lerta.com.tr A=${WWW_IP:-yok} (beklenen ${EXPECTED_IP})" >&2
  echo "Preflight: bash scripts/preflight-www-cutover-lerta-mail.sh" >&2
  exit 1
fi

if [[ "$(id -u)" -eq 0 ]]; then
  mkdir -p "$BACKUP_DIR"
  ts="$(date -u +%Y%m%dT%H%MZ)"
  for f in /etc/nginx/sites-enabled/*; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"
    if grep -qE 'www\.lerta\.com\.tr|lerta\.com\.tr' "$f" 2>/dev/null; then
      cp -a "$f" "${BACKUP_DIR}/${ts}-${base}.bak"
      echo "Yedek: ${BACKUP_DIR}/${ts}-${base}.bak"
    fi
  done
fi

cd "$INSTALL_DIR"
bash scripts/restart-mail-marketing.sh "$INSTALL_DIR"

if [[ "$(id -u)" -eq 0 ]]; then
  bash scripts/nginx-www-lerta-mail-marketing.sh
  if [[ "${REDIRECT_KURUMSAL}" == "yes" ]]; then
    bash scripts/nginx-kurumsal-redirect-to-www.sh || echo "UYARI: kurumsal redirect atlandı veya sertifika eksik"
  fi
else
  echo "NOT: root değilsiniz — nginx-www-lerta-mail-marketing.sh VPS'te root ile çalıştırın." >&2
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Nginx cutover atlandı (root gerekli). VPS:"
  echo "  CONFIRM_CUTOVER=yes bash scripts/apply-www-cutover-lerta-mail.sh"
  exit 0
fi

echo ""
echo "== Post-cutover smoke =="
if BASE_URL="https://www.lerta.com.tr" bash scripts/smoke-www-cutover-lerta-mail.sh; then
  echo "Cutover tamam."
else
  echo "Cutover uygulandı ama smoke FAIL — nginx/TLS kontrol edin." >&2
  exit 4
fi
