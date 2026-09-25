#!/usr/bin/env bash
# Postfix/OpenDKIM + inbound tenant — mail.lerta.com.tr / kullanici.lerta.com.tr
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
MAIL_HOST="${MAIL_HOSTNAME:-mail.lerta.com.tr}"
TENANT_DOMAIN="${TENANT_DOMAIN:-kullanici.lerta.com.tr}"

echo "==> Postfix myhostname=${MAIL_HOST}"
postconf -e "myhostname = ${MAIL_HOST}"
postconf -e "myorigin = ${MAIL_HOST}"

echo "==> Platform DKIM (${MAIL_HOST})"
DKIM_DIR="/etc/opendkim/keys/${MAIL_HOST}"
if [[ ! -f "${DKIM_DIR}/default.private" ]]; then
  mkdir -p "${DKIM_DIR}"
  opendkim-genkey -b 2048 -d "${MAIL_HOST}" -s default -D "${DKIM_DIR}"
  chown -R opendkim:opendkim /etc/opendkim/keys
  KT="default._domainkey.${MAIL_HOST} ${MAIL_HOST}:default:${DKIM_DIR}/default.private"
  ST="*@${MAIL_HOST} default._domainkey.${MAIL_HOST}"
  grep -qF "${KT}" /etc/opendkim/KeyTable 2>/dev/null || echo "${KT}" >> /etc/opendkim/KeyTable
  grep -qF "${ST}" /etc/opendkim/SigningTable 2>/dev/null || echo "${ST}" >> /etc/opendkim/SigningTable
  echo "Platform DKIM TXT:"
  cat "${DKIM_DIR}/default.txt"
fi

echo "==> Tenant DKIM (${TENANT_DOMAIN})"
TENANT_DOMAIN="${TENANT_DOMAIN}" bash "${INSTALL_DIR}/scripts/setup-opendkim-kullanici-lerta-tr.sh"

export MAIL_PLATFORM_TENANT_DOMAIN="${TENANT_DOMAIN}"
bash "${INSTALL_DIR}/scripts/setup-postfix-inbound-c2.sh"

systemctl restart opendkim postfix
echo "Pilot MTA hazır. DNS: docs/DNS_LERTA_COM_TR_ISIMTESCIL.md"
