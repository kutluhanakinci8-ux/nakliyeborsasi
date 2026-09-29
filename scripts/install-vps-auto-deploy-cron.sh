#!/usr/bin/env bash
# VPS üzerinde çalıştırın: origin/main değişince otomatik production deploy (15 dk).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
CRON_FILE="/etc/cron.d/lerta-nakliyeborsasi-auto-deploy"
LOG="/var/log/lerta-auto-deploy.log"

cat > "${CRON_FILE}" <<EOF
# Lerta — git main güncellemesi (deploy-production-vps.sh)
*/15 * * * * root cd ${INSTALL_DIR} && git fetch origin main -q && OLD=\$(git rev-parse HEAD) && git rev-parse origin/main >/dev/null && NEW=\$(git rev-parse origin/main) && [ "\$OLD" != "\$NEW" ] && DEPLOY_BRANCH=main bash ${INSTALL_DIR}/scripts/deploy-production-vps.sh ${INSTALL_DIR} >> ${LOG} 2>&1
EOF
chmod 644 "${CRON_FILE}"
echo "OK: ${CRON_FILE} (her 15 dk, değişiklik varsa deploy)"
echo "Log: ${LOG}"
