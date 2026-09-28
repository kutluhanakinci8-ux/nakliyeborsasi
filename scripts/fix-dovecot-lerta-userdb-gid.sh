#!/usr/bin/env bash
# Dovecot static userdb: gid=vmail is invalid on Debian (vmail → gid mail).
set -euo pipefail

CONF="/etc/dovecot/conf.d/99-lerta-mail.conf"
if [[ ! -f "${CONF}" ]]; then
  echo "Missing ${CONF}" >&2
  exit 1
fi

if grep -q 'gid=vmail' "${CONF}"; then
  sed -i 's/gid=vmail/gid=mail/g' "${CONF}"
  echo "OK: patched gid=mail in ${CONF}"
else
  echo "OK: no gid=vmail in ${CONF}"
fi

doveconf -n >/dev/null
systemctl restart dovecot
echo "OK: dovecot restarted"
