#!/usr/bin/env bash
# Faz A DNS doğrulama (lokal veya VPS)
set -euo pipefail

EXPECTED_IP="${MAIL_PLATFORM_SPF_IPV4:-168.231.109.27}"
MAIL_HOST="${MAIL_PLATFORM_DOMAIN:-mail.lerta.tr}"

echo "=== Faz A DNS: ${MAIL_HOST} → ${EXPECTED_IP} ==="

A=$(dig +short A "${MAIL_HOST}" | head -1)
echo "A record: ${A:-<yok>}"
if [[ "${A}" == "${EXPECTED_IP}" ]]; then
  echo "OK: A kaydı"
else
  echo "UYARI: A kaydı beklenen IP ile eşleşmiyor"
fi

PTR=$(dig +short -x "${EXPECTED_IP}" | head -1)
echo "PTR: ${PTR:-<yok>}"
if [[ "${PTR}" == *"mail.lerta.tr"* ]]; then
  echo "OK: PTR"
else
  echo "UYARI: PTR mail.lerta.tr içermiyor (Hostinger)"
fi

SPF=$(dig +short TXT "${MAIL_HOST}" | tr -d '"' | head -1)
echo "SPF: ${SPF}"
echo "=== Bitti ==="
