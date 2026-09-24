#!/usr/bin/env bash
# Faz B — OpenDKIM signing for kullanici.lerta.tr (tenant transactional From).
set -euo pipefail

TENANT_DOMAIN="${TENANT_DOMAIN:-kullanici.lerta.tr}"
SELECTOR="${DKIM_SELECTOR:-default}"
DKIM_DIR="/etc/opendkim/keys/${TENANT_DOMAIN}"

mkdir -p "${DKIM_DIR}"
if [[ ! -f "${DKIM_DIR}/${SELECTOR}.private" ]]; then
  opendkim-genkey -b 1024 -d "${TENANT_DOMAIN}" -s "${SELECTOR}" -D "${DKIM_DIR}"
  chown -R opendkim:opendkim /etc/opendkim/keys
fi

KEYTABLE_LINE="${SELECTOR}._domainkey.${TENANT_DOMAIN} ${TENANT_DOMAIN}:${SELECTOR}:${DKIM_DIR}/${SELECTOR}.private"
SIGNINGTABLE_LINE="*@${TENANT_DOMAIN} ${SELECTOR}._domainkey.${TENANT_DOMAIN}"

grep -qF "${KEYTABLE_LINE}" /etc/opendkim/KeyTable 2>/dev/null || echo "${KEYTABLE_LINE}" >> /etc/opendkim/KeyTable
grep -qF "${SIGNINGTABLE_LINE}" /etc/opendkim/SigningTable 2>/dev/null || echo "${SIGNINGTABLE_LINE}" >> /etc/opendkim/SigningTable

echo "========== DKIM DNS (isimtescil) =========="
echo "Host: ${SELECTOR}._domainkey.${TENANT_DOMAIN}"
cat "${DKIM_DIR}/${SELECTOR}.txt"
echo "==========================================="
echo "TXT SPF for ${TENANT_DOMAIN}: v=spf1 ip4:<VPS_IP> -all"
systemctl restart opendkim postfix
