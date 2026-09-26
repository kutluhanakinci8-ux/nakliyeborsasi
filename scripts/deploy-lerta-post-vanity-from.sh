#!/usr/bin/env bash
# VPS: Lerta Post From başlığı info@firma.post (PR #98 / vanity-from fix).
set -euo pipefail

INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
BRANCH="${BRANCH:-cursor/mail-instant-box-dns-519e}"

cd "${INSTALL_DIR}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

npm ci
npm run build -w @nakliyeborsasi/core
npm run build -w @nakliyeborsasi/api

bash "${INSTALL_DIR}/scripts/restart-api.sh"

echo "==> OpenDKIM vanity imza (abayer.post → abayer.post.lerta.com.tr)"
DOMAIN_FQDN="abayer.post.lerta.com.tr"
VANITY_DOMAIN="abayer.post"
SELECTOR="default"
KT="${SELECTOR}._domainkey.${DOMAIN_FQDN}"
ST="*@${VANITY_DOMAIN} ${KT}"
if [[ -f /etc/opendkim/SigningTable ]] && ! grep -qF "${ST}" /etc/opendkim/SigningTable; then
  echo "${ST}" >> /etc/opendkim/SigningTable
  systemctl restart opendkim || true
fi

if [[ -x "${INSTALL_DIR}/scripts/register-opendkim-custom-domain.sh" ]] && [[ ! -f "/etc/opendkim/keys/${DOMAIN_FQDN}/default.private" ]]; then
  bash "${INSTALL_DIR}/scripts/register-opendkim-custom-domain.sh" "${DOMAIN_FQDN}" || true
fi

echo "Deploy tamam. Test: webmailden mail gönderin; Kimden: info@abayer.post olmalı."
