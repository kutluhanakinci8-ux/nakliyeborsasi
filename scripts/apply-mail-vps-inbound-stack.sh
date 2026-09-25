#!/usr/bin/env bash
# VPS: dış inbound (MX) + C2 Postfix + C4 Rspamd + Dovecot — root olarak çalıştırın.
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
ENV_FILE="${INSTALL_DIR}/.env"

echo "=== Lerta mail inbound stack ==="
bash "${INSTALL_DIR}/scripts/setup-postfix-inbound-c2.sh"
bash "${INSTALL_DIR}/scripts/setup-rspamd-c4.sh"
bash "${INSTALL_DIR}/scripts/setup-dovecot-c4.sh"

if [[ -f "${ENV_FILE}" ]]; then
  set_kv() {
    local key="$1"
    local value="$2"
    if grep -q "^${key}=" "${ENV_FILE}"; then
      sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
    else
      echo "${key}=${value}" >> "${ENV_FILE}"
    fi
  }
  set_kv "MAIL_INBOUND_APPLY_POSTFIX" "true"
  set_kv "MAIL_IMAP_APPLY_DOVECOT" "true"
  set_kv "MAIL_IMAP_MAILDIR_ROOT" "/var/mail/vhosts"
  set_kv "MAIL_INBOUND_VIRTUAL_DOMAINS" "${MAIL_PLATFORM_TENANT_DOMAIN:-kullanici.lerta.tr}"
  echo "Updated ${ENV_FILE} (inbound + IMAP flags)."
fi

echo ""
echo "=== Dinleyici kontrolü (25 / 993) ==="
ss -tlnp | grep -E ':25|:993' || true
echo ""
echo "DNS (isimtescil — manuel):"
echo "  MX  kullanici.lerta.tr  →  10 mail.lerta.tr"
echo "  TXT _dmarc.kullanici.lerta.tr → v=DMARC1; p=none; rua=mailto:dmarc@lerta.tr"
echo "Hostinger: PTR 168.231.109.27 → mail.lerta.tr"
echo ""
echo "API yeniden başlat: cd ${INSTALL_DIR} && bash scripts/restart-api.sh"
echo "Dovecot passwd: admin → POST .../mail/imap/sync-dovecot veya org IMAP rotate"
