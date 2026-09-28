#!/usr/bin/env bash
# PM-4: posta.lerta.com.tr PWA shell + offline SW sürümü
set -euo pipefail
POSTA_URL="${POSTA_URL:-https://posta.lerta.com.tr}"
SW_BODY="$(curl -fsS --connect-timeout 15 "${POSTA_URL}/sw.js" 2>/dev/null || true)"
if [[ -z "${SW_BODY}" ]]; then
  echo "NOT: ${POSTA_URL}/sw.js alınamadı" >&2
  exit 1
fi
if [[ "${SW_BODY}" != *"lerta-mail-shell-v7"* ]]; then
  echo "NOT: SW shell v7 bekleniyor (deploy / cache bust)" >&2
  exit 2
fi
if [[ "${SW_BODY}" != *"lerta-mail-offline-snapshot"* ]]; then
  echo "NOT: SW offline snapshot handler eksik" >&2
  exit 4
fi
MANIFEST_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 "${POSTA_URL}/manifest.webmanifest" || echo 000)"
echo "manifest.webmanifest → HTTP ${MANIFEST_CODE}"
if [[ "${MANIFEST_CODE}" != "200" ]]; then
  exit 3
fi
echo "OK: PM-4 PWA shell prod (${POSTA_URL})"
