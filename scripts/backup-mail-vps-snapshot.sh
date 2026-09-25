#!/usr/bin/env bash
# E7 — Maildir + OpenDKIM yedek (VPS cron)
set -euo pipefail

MAILDIR_ROOT="${MAIL_IMAP_MAILDIR_ROOT:-/var/mail/vhosts}"
BACKUP_DIR="${LERTA_MAIL_BACKUP_DIR:-/var/backups/lerta-mail}"
RETENTION_DAYS="${LERTA_MAIL_BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OPENDKIM_DIR="/etc/opendkim"

mkdir -p "${BACKUP_DIR}"

if [[ -d "${MAILDIR_ROOT}" ]]; then
  MAILDIR_ARCHIVE="${BACKUP_DIR}/maildir-${STAMP}.tar.gz"
  echo "Maildir arşiv: ${MAILDIR_ROOT} → ${MAILDIR_ARCHIVE}"
  tar -czf "${MAILDIR_ARCHIVE}" -C "$(dirname "${MAILDIR_ROOT}")" "$(basename "${MAILDIR_ROOT}")"
  echo "OK: $(du -h "${MAILDIR_ARCHIVE}" | awk '{print $1}')"
else
  echo "UYARI: Maildir kökü yok: ${MAILDIR_ROOT}"
fi

if [[ -d "${OPENDKIM_DIR}" ]]; then
  DKIM_ARCHIVE="${BACKUP_DIR}/opendkim-${STAMP}.tar.gz"
  echo "OpenDKIM arşiv: ${OPENDKIM_DIR} → ${DKIM_ARCHIVE}"
  tar -czf "${DKIM_ARCHIVE}" -C /etc opendkim
  echo "OK: $(du -h "${DKIM_ARCHIVE}" | awk '{print $1}')"
else
  echo "UYARI: ${OPENDKIM_DIR} bulunamadı"
fi

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && [[ "${RETENTION_DAYS}" -gt 0 ]]; then
  find "${BACKUP_DIR}" -maxdepth 1 -type f \( -name 'maildir-*.tar.gz' -o -name 'opendkim-*.tar.gz' \) -mtime +"${RETENTION_DAYS}" -delete
  echo "Retention: ${RETENTION_DAYS} gün üstü silindi"
fi

echo "=== Yedek tamam (${STAMP}) ==="
