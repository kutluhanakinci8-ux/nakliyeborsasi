#!/usr/bin/env bash
# Point Dovecot IMAP SSL at Let's Encrypt for MAIL_IMAP_HOST (e.g. mail.lerta.com.tr).
set -euo pipefail

ENV_FILE="${ENV_FILE:-/var/www/nakliyeborsasi/.env}"
HOST="${MAIL_IMAP_HOST:-mail.lerta.com.tr}"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^MAIL_IMAP_HOST=' "${ENV_FILE}" || true)
  HOST="${MAIL_IMAP_HOST:-${HOST}}"
fi

LE_DIR="/etc/letsencrypt/live/${HOST}"
SNIPPET="/etc/dovecot/conf.d/99-lerta-mail-tls-le.conf"

if [[ ! -f "${LE_DIR}/fullchain.pem" || ! -f "${LE_DIR}/privkey.pem" ]]; then
  if command -v certbot >/dev/null 2>&1 && [[ "$(id -u)" -eq 0 ]]; then
    echo "LE sertifika yok — certbot --nginx -d ${HOST} deneniyor…"
    if certbot certonly --nginx -d "${HOST}" \
      --non-interactive --agree-tos --register-unsafely-without-email 2>/dev/null; then
      echo "OK: certbot sertifika alındı"
    fi
  fi
fi

if [[ ! -f "${LE_DIR}/fullchain.pem" || ! -f "${LE_DIR}/privkey.pem" ]]; then
  echo "Sertifika yok: ${LE_DIR}" >&2
  echo "Örnek: certbot certonly --nginx -d ${HOST}" >&2
  exit 1
fi

cat >"${SNIPPET}" <<EOF
ssl = required
ssl_cert = <${LE_DIR}/fullchain.pem
ssl_key = <${LE_DIR}/privkey.pem
EOF

doveconf -n >/dev/null
systemctl reload dovecot || systemctl restart dovecot
echo "OK: Dovecot TLS → ${LE_DIR}"
