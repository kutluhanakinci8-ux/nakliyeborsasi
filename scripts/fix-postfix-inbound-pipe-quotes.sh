#!/usr/bin/env bash
# Gelen posta: virtual→local stub + pipe aliases (Postfix loopback düzeltmesi).
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
VIRTUAL_PATH="${MAIL_INBOUND_POSTFIX_VIRTUAL_PATH:-/etc/postfix/lerta-inbound-virtual}"
ALIASES_PATH="${MAIL_INBOUND_POSTFIX_ALIASES_PATH:-/etc/postfix/lerta-inbound-aliases}"
PIPE_SCRIPT="${MAIL_INBOUND_PIPE_SCRIPT:-${INSTALL_DIR}/scripts/postfix-pipe-inbound-to-api.sh}"
MAIL_HOST="${MAIL_HOSTNAME:-mail.lerta.com.tr}"

echo "==> Postfix inbound pipe düzeltmesi"

postconf -e "mydestination = ${MAIL_HOST}, localhost"
postconf -e "local_transport = local:"
postconf -e "virtual_mailbox_domains = kullanici.lerta.com.tr"
postconf -e "virtual_alias_maps = hash:${VIRTUAL_PATH}"
postconf -e "alias_maps = hash:/etc/aliases, hash:${ALIASES_PATH}"

touch "${ALIASES_PATH}"
postalias "${ALIASES_PATH}" 2>/dev/null || true

if [[ -x "${INSTALL_DIR}/scripts/rebuild-postfix-inbound-from-virtual.sh" ]]; then
  bash "${INSTALL_DIR}/scripts/rebuild-postfix-inbound-from-virtual.sh"
fi

echo "API Postfix senkronu için: nakliyeborsasi-api restart veya yönetim → inbound-routing/sync-postfix"
postfix reload
echo "OK: mydestination=${MAIL_HOST}, alias_maps includes ${ALIASES_PATH}"
