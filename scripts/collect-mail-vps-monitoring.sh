#!/usr/bin/env bash
# F1 — VPS yerel metrik (cron / log); API token gerekmez
set -euo pipefail

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
MAILDIR="${MAIL_IMAP_MAILDIR_ROOT:-/var/mail/vhosts}"
BACKUP="${LERTA_MAIL_BACKUP_DIR:-/var/backups/lerta-mail}"

disk_line() {
  local path="$1"
  if [[ -d "$path" ]]; then
    df -P "$path" | tail -1 | awk -v p="$path" '{printf "%s used=%s%% avail=%s\n", p, $5, $4}'
  fi
}

POSTFIX_MSG="unknown"
if command -v mailq >/dev/null 2>&1; then
  if mailq 2>/dev/null | grep -q "Mail queue is empty"; then
    POSTFIX_MSG="empty"
  else
    POSTFIX_MSG="non-empty"
  fi
fi

CERT_DAYS=""
if [[ -n "${MAIL_TLS_CERT_PATHS:-}" ]]; then
  IFS=',' read -ra CERTS <<< "${MAIL_TLS_CERT_PATHS}"
  for cert in "${CERTS[@]}"; do
    cert="${cert// /}"
    if [[ -f "$cert" ]]; then
      end="$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2)"
      CERT_DAYS="${CERT_DAYS}${cert}=${end};"
    fi
  done
fi

echo "{\"collectedAt\":\"${STAMP}\",\"postfix\":\"${POSTFIX_MSG}\",\"disk\":{"
echo "\"root\":\"$(disk_line / | tr '\n' ' ')\","
echo "\"maildir\":\"$(disk_line "$MAILDIR" | tr '\n' ' ')\","
echo "\"backup\":\"$(disk_line "$BACKUP" | tr '\n' ' ')\""
echo "},\"tls\":\"${CERT_DAYS}\"}"
