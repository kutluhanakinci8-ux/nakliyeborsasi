#!/usr/bin/env bash
# www → Lerta Mail vitrin (DNS hazır olduğunda). U88'yi önce taşıyın.
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
EXPECTED_IP="${EXPECTED_IP:-168.231.109.27}"
CONFIRM="${CONFIRM_CUTOVER:-}"

if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Cutover için: CONFIRM_CUTOVER=yes bash $0" >&2
  echo "Önce docs/WWW_CUTOVER_LERTA_MAIL.md ve U88 taşıması." >&2
  exit 1
fi

WWW_IP="$(dig +short www.lerta.com.tr A | head -1 || true)"
if [[ "${WWW_IP}" != "${EXPECTED_IP}" ]]; then
  echo "DNS hazır değil: www.lerta.com.tr A=${WWW_IP:-yok} (beklenen ${EXPECTED_IP})" >&2
  exit 1
fi

cd "$INSTALL_DIR"
bash scripts/restart-mail-marketing.sh "$INSTALL_DIR"
bash scripts/nginx-www-lerta-mail-marketing.sh
echo "Cutover uygulandı. Test: curl -sI https://www.lerta.com.tr/ | head -5"
