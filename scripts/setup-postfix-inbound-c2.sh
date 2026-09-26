#!/usr/bin/env bash
# Faz C2 — Inbound MX: Postfix virtual_alias → pipe → API webhook
# Run as root on VPS (after setup-postfix-phase-a-lerta.sh).
set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"
TENANT_DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-${TENANT_DOMAIN:-kullanici.lerta.com.tr}}"
MAIL_HOST="${MAIL_HOSTNAME:-mail.lerta.com.tr}"
VIRTUAL_PATH="${MAIL_INBOUND_POSTFIX_VIRTUAL_PATH:-/etc/postfix/lerta-inbound-virtual}"
ALIASES_PATH="${MAIL_INBOUND_POSTFIX_ALIASES_PATH:-/etc/postfix/lerta-inbound-aliases}"
PIPE_SCRIPT="${MAIL_INBOUND_PIPE_SCRIPT:-${INSTALL_DIR}/scripts/postfix-pipe-inbound-to-api.sh}"

echo "==> C2 inbound: virtual domains + alias map (internet MX)"
# Faz A script sets loopback-only; inbound MX requires public SMTP.
postconf -e "inet_interfaces = all"
postconf -e "inet_protocols = ipv4"
postconf -e "mydestination = ${MAIL_HOST}, localhost"
postconf -e "virtual_mailbox_domains = ${TENANT_DOMAIN}"
postconf -e "virtual_alias_maps = hash:${VIRTUAL_PATH}"
postconf -e "alias_maps = hash:/etc/aliases, hash:${ALIASES_PATH}"
postconf -e "local_transport = local:"
touch "${ALIASES_PATH}"
postalias "${ALIASES_PATH}" 2>/dev/null || true
postconf -e "smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_non_fqdn_recipient, reject_unknown_recipient_domain, permit"
postconf -e "smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, defer_unauth_destination"

touch "${VIRTUAL_PATH}"
postmap "${VIRTUAL_PATH}" || true

if [[ -x "${PIPE_SCRIPT}" ]]; then
  echo "Pipe script OK: ${PIPE_SCRIPT}"
else
  chmod +x "${PIPE_SCRIPT}" 2>/dev/null || true
fi

echo ""
echo "DNS (isimtescil): MX ${TENANT_DOMAIN} → 10 mail.lerta.tr (veya VPS A kaydı)"
echo "VPS .env:"
echo "  MAIL_INBOUND_APPLY_POSTFIX=true"
echo "  MAIL_INBOUND_WEBHOOK_SECRET=..."
echo "Admin → Bildirimler → Gelen (C1) → Postfix virtual senkron"
echo ""
systemctl reload postfix
echo "Postfix reloaded."
