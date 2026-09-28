#!/usr/bin/env bash
set -euo pipefail
PASSWD="${MAIL_IMAP_DOVECOT_PASSWD_PATH:-/etc/dovecot/lerta-imap-passwd}"
[[ -f "${PASSWD}" ]] || exit 0
chown root:dovecot "${PASSWD}"
chmod 640 "${PASSWD}"
echo "OK: ${PASSWD} → root:dovecot 640"
