#!/usr/bin/env bash
# IMAP gold: Sent/Archive/Trash/Junk special-use (Thunderbird + Apple Mail).
set -euo pipefail

CONF="/etc/dovecot/conf.d/99-lerta-mail.conf"
SNIPPET="/etc/dovecot/conf.d/99-lerta-mail-gold-folders.conf"

if [[ ! -f "${CONF}" ]]; then
  echo "Önce: bash scripts/setup-dovecot-c4.sh" >&2
  exit 1
fi

cat >"${SNIPPET}" <<'EOF'
# Lerta — Maildir++ klasörleri → IMAP SPECIAL-USE (gold smoke)
namespace inbox {
  inbox = yes
  location = maildir:%%h/Maildir

  mailbox ".Sent" {
    auto = create
    special_use = \Sent
  }
  mailbox ".Archive" {
    auto = create
    special_use = \Archive
  }
  mailbox ".Trash" {
    auto = create
    special_use = \Trash
  }
  mailbox ".Junk" {
    auto = create
    special_use = \Junk
  }
}
EOF

if doveconf -n >/dev/null 2>&1; then
  systemctl reload dovecot || systemctl restart dovecot
  echo "OK: Dovecot gold folder namespace yüklendi (${SNIPPET})"
else
  echo "doveconf hatası — snippet geri alınıyor" >&2
  rm -f "${SNIPPET}"
  doveconf -n
  exit 1
fi
