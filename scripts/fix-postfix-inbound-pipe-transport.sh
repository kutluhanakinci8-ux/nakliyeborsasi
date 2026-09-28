#!/usr/bin/env bash
# VPS: virtual_transport=virtual (IMAP) inbound pipe ile çakışıyor — düzelt.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

VIRTUAL_DOMAINS="lerta.com.tr,post.lerta.com.tr"
if [[ -f "${ENV_FILE}" ]]; then
  line="$(grep -E '^MAIL_INBOUND_VIRTUAL_DOMAINS=' "${ENV_FILE}" | tail -1 || true)"
  if [[ -n "${line}" ]]; then
    VIRTUAL_DOMAINS="${line#MAIL_INBOUND_VIRTUAL_DOMAINS=}"
  fi
fi

echo "==> virtual_mailbox_domains=${VIRTUAL_DOMAINS}"
postconf -e "virtual_mailbox_domains = ${VIRTUAL_DOMAINS}"
postconf -e "virtual_transport = local:"
postconf -# virtual_mailbox_base 2>/dev/null || true
postconf -e "local_transport = local:"

VIRTUAL_PATH="${MAIL_INBOUND_POSTFIX_VIRTUAL_PATH:-/etc/postfix/lerta-inbound-virtual}"
ALIASES_PATH="${MAIL_INBOUND_POSTFIX_ALIASES_PATH:-/etc/postfix/lerta-inbound-aliases}"
if [[ -f "${VIRTUAL_PATH}" ]]; then
  postmap "${VIRTUAL_PATH}" || true
fi
if [[ -f "${ALIASES_PATH}" ]]; then
  postalias "${ALIASES_PATH}" || true
fi

systemctl reload postfix
echo "Postfix reloaded. API restart → Postfix virtual sync (bootstrap ~8s)."
