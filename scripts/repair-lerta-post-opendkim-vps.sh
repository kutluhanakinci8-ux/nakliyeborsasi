#!/usr/bin/env bash
# 451 4.7.1 — OpenDKIM vanity From (@firma.post) imzası. Root VPS.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
SLUG="${1:-abayer}"
FQDN="${SLUG}.post.lerta.com.tr"
VANITY="*@${SLUG}.post default._domainkey.${FQDN}"

if [[ -x "${INSTALL_DIR}/scripts/register-opendkim-custom-domain.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/register-opendkim-custom-domain.sh" "${FQDN}" || true
fi

if [[ -f /etc/opendkim/SigningTable ]] && ! grep -qF "${VANITY}" /etc/opendkim/SigningTable; then
  echo "${VANITY}" >> /etc/opendkim/SigningTable
fi

systemctl restart opendkim 2>/dev/null || true
systemctl restart postfix 2>/dev/null || true

echo "Tamam: ${VANITY}"
echo "API: MAIL_SYNC_OPENDKIM=true ve bash scripts/deploy-lerta-post-vanity-from.sh"
