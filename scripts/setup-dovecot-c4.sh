#!/usr/bin/env bash
# Faz C4 — Dovecot IMAP (Maildir) for Lerta org mailboxes
set -euo pipefail

MAILDIR_ROOT="${MAIL_IMAP_MAILDIR_ROOT:-/var/mail/vhosts}"
PASSWD_FILE="${MAIL_IMAP_DOVECOT_PASSWD_PATH:-/etc/dovecot/lerta-imap-passwd}"
DOMAIN="${MAIL_PLATFORM_TENANT_DOMAIN:-lerta.com.tr}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y dovecot-imapd dovecot-core

mkdir -p "${MAILDIR_ROOT}"
mkdir -p "$(dirname "${PASSWD_FILE}")"
touch "${PASSWD_FILE}"
chmod 600 "${PASSWD_FILE}"

cat >/etc/dovecot/conf.d/99-lerta-mail.conf <<EOF
protocols = imap
mail_location = maildir:${MAILDIR_ROOT}/%d/%n/Maildir
auth_mechanisms = plain login
passdb {
  driver = passwd-file
  args = scheme=BLF-CRYPT ${PASSWD_FILE}
}
userdb {
  driver = static
  args = uid=vmail gid=vmail home=${MAILDIR_ROOT}/%d/%n
}
ssl = yes
EOF

id -u vmail &>/dev/null || useradd -r -u 5000 -g mail -d "${MAILDIR_ROOT}" -s /usr/sbin/nologin vmail
chown -R vmail:mail "${MAILDIR_ROOT}"

systemctl enable dovecot
systemctl restart dovecot
echo "Dovecot IMAP hazır. Maildir: ${MAILDIR_ROOT}, passwd: ${PASSWD_FILE}"
echo "Admin: POST platform-admin/mail/imap/sync-dovecot (MAIL_IMAP_APPLY_DOVECOT=true)"
echo "Org: POST company/mail-inbox/imap-credentials/rotate"
