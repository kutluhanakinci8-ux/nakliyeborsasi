#!/usr/bin/env bash
# PM-5: Maildir klasör iskeleti + Dovecot passwd dosyası kontrolü
set -euo pipefail
EMAIL="${1:-}"
ENV_FILE="${2:-/var/www/nakliyeborsasi/.env}"
if [[ -z "$EMAIL" ]]; then
  echo "Kullanım: $0 <mailbox@domain> [.env]"
  exit 1
fi
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
ROOT="${MAIL_IMAP_MAILDIR_ROOT:-}"
if [[ -z "$ROOT" ]]; then
  echo "MAIL_IMAP_MAILDIR_ROOT tanımlı değil — IMAP maildir kapalı."
  exit 2
fi
LOCAL="${EMAIL%@*}"
DOMAIN="${EMAIL#*@}"
BASE="$ROOT/$DOMAIN/$LOCAL/Maildir"
missing=0
for sub in new .Sent/cur .Archive/new .Trash/new .Junk/new; do
  if [[ ! -d "$BASE/$sub" ]]; then
    echo "Eksik klasör: $BASE/$sub"
    missing=1
  fi
done
PASSWD="${MAIL_IMAP_DOVECOT_PASSWD_FILE:-/etc/dovecot/passwd-lerta}"
if [[ -f "$PASSWD" ]]; then
  if grep -q "^${EMAIL}:" "$PASSWD" 2>/dev/null; then
    echo "OK: Dovecot passwd kaydı var ($EMAIL)"
  else
    echo "Uyarı: $PASSWD içinde $EMAIL yok — sync-dovecot çalıştırın"
    missing=1
  fi
else
  echo "Uyarı: Dovecot passwd dosyası yok: $PASSWD"
fi
if [[ $missing -eq 1 ]]; then
  exit 3
fi
echo "OK: PM-5 maildir iskeleti hazır ($BASE)"
