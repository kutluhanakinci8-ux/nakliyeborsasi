#!/usr/bin/env bash
# Faz B5 — OpenDKIM signing for a customer custom domain (e.g. musteri.com).
# Usage: bash scripts/register-opendkim-custom-domain.sh musteri.com [selector]
set -euo pipefail

DOMAIN="${1:?Domain gerekli (ör. musteri.com)}"
SELECTOR="${2:-default}"
DKIM_DIR="/etc/opendkim/keys/${DOMAIN}"

mkdir -p "${DKIM_DIR}"
if [[ ! -f "${DKIM_DIR}/${SELECTOR}.private" ]]; then
  opendkim-genkey -b 1024 -d "${DOMAIN}" -s "${SELECTOR}" -D "${DKIM_DIR}"
  chown -R opendkim:opendkim /etc/opendkim/keys
fi

KEYTABLE_LINE="${SELECTOR}._domainkey.${DOMAIN} ${DOMAIN}:${SELECTOR}:${DKIM_DIR}/${SELECTOR}.private"
SIGNINGTABLE_LINE="*@${DOMAIN} ${SELECTOR}._domainkey.${DOMAIN}"

grep -qF "${KEYTABLE_LINE}" /etc/opendkim/KeyTable 2>/dev/null || echo "${KEYTABLE_LINE}" >> /etc/opendkim/KeyTable
grep -qF "${SIGNINGTABLE_LINE}" /etc/opendkim/SigningTable 2>/dev/null || echo "${SIGNINGTABLE_LINE}" >> /etc/opendkim/SigningTable

echo "========== DKIM DNS =========="
echo "Host: ${SELECTOR}._domainkey.${DOMAIN}"
cat "${DKIM_DIR}/${SELECTOR}.txt"
echo "=============================="
echo "SPF (TXT @ ${DOMAIN}): v=spf1 ip4:<VPS_IP> -all"
systemctl restart opendkim postfix
