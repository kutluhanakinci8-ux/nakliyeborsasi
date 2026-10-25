#!/usr/bin/env bash
# G9 / UAT M2: Postfix submission :587 + Dovecot SASL (IMAP şifresi ile gönderim).
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "root olarak çalıştırın." >&2
  exit 1
fi

DOVECOT_SASL_SNIP="/etc/dovecot/conf.d/99-lerta-postfix-sasl.conf"
if [[ ! -f "${DOVECOT_SASL_SNIP}" ]]; then
  cat >"${DOVECOT_SASL_SNIP}" <<'EOF'
# Lerta — Postfix smtp-auth (Outlook mobil / Thunderbird giden)
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOF
  echo "OK: ${DOVECOT_SASL_SNIP}"
fi

if ! grep -q '^smtpd_sasl_auth_enable' /etc/postfix/main.cf 2>/dev/null; then
  postconf -e 'smtpd_sasl_auth_enable = yes'
  postconf -e 'smtpd_sasl_type = dovecot'
  postconf -e 'smtpd_sasl_path = private/auth'
  postconf -e 'broken_sasl_auth_clients = yes'
  echo "OK: postfix main.cf SASL (dovecot)"
fi

if ! postconf -Mf 'submission/inet' >/dev/null 2>&1; then
  postconf -M 'submission/inet=submission inet n - y - - smtpd'
  postconf -P 'submission/inet/syslog_name=postfix/submission'
  postconf -P 'submission/inet/smtpd_tls_security_level=encrypt'
  postconf -P 'submission/inet/smtpd_sasl_auth_enable=yes'
  postconf -P 'submission/inet/smtpd_tls_auth_only=yes'
  postconf -P 'submission/inet/smtpd_reject_unlisted_recipient=no'
  postconf -P 'submission/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject'
  postconf -P 'submission/inet/milter_macro_daemon_name=ORIGINATING'
  echo "OK: postfix submission/inet :587"
else
  echo "SKIP: submission/inet zaten tanımlı"
fi

systemctl restart dovecot
systemctl reload postfix

if ss -tlnp | grep -q ':587 '; then
  echo "OK: dinleyici :587"
else
  echo "NOT: :587 dinlemiyor" >&2
  exit 1
fi

echo "enable-postfix-submission-587: PASS"
