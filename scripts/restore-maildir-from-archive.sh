#!/usr/bin/env bash
# E7 — Maildir tarball geri yükleme (dikkatli kullanın)
set -euo pipefail

ARCHIVE="${1:?Kullanım: $0 <maildir-*.tar.gz> --target-root /var/mail/vhosts --confirm}"
TARGET_ROOT="${LERTA_MAIL_RESTORE_TARGET:-/var/mail/vhosts}"
CONFIRM=""

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-root)
      TARGET_ROOT="$2"
      shift 2
      ;;
    --confirm)
      CONFIRM="yes"
      shift
      ;;
    *)
      echo "Bilinmeyen argüman: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Arşiv bulunamadı: ${ARCHIVE}" >&2
  exit 1
fi

echo "Arşiv: ${ARCHIVE}"
echo "Hedef kök: ${TARGET_ROOT}"
echo "İçerik önizleme (ilk 20 satır):"
tar -tzf "${ARCHIVE}" | head -20

if [[ "${CONFIRM}" != "yes" ]]; then
  echo ""
  echo "Dry-run bitti. Geri yükleme için --confirm ekleyin."
  exit 0
fi

PARENT="$(dirname "${TARGET_ROOT}")"
BASE="$(basename "${TARGET_ROOT}")"
mkdir -p "${PARENT}"

if [[ -d "${TARGET_ROOT}" ]]; then
  BAK="${TARGET_ROOT}.pre-restore-$(date +%Y%m%d-%H%M%S)"
  echo "Mevcut kök yedekleniyor: ${TARGET_ROOT} → ${BAK}"
  mv "${TARGET_ROOT}" "${BAK}"
fi

echo "Extract..."
tar -xzf "${ARCHIVE}" -C "${PARENT}"
if [[ ! -d "${TARGET_ROOT}" ]]; then
  # arşiv vhosts/ altında olabilir
  if [[ -d "${PARENT}/vhosts" ]]; then
    mv "${PARENT}/vhosts" "${TARGET_ROOT}"
  fi
fi

chown -R vmail:vmail "${TARGET_ROOT}" 2>/dev/null || chown -R dovecot:dovecot "${TARGET_ROOT}" 2>/dev/null || true
echo "=== Maildir restore tamam ==="
