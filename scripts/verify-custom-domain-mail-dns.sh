#!/usr/bin/env bash
# Operatör: müşteri / özel domain SPF, DKIM (default selector), DMARC TXT kontrolü
set -euo pipefail

DOMAIN="${1:?Kullanım: bash scripts/verify-custom-domain-mail-dns.sh musteri.com.tr [selector]}"
SELECTOR="${2:-default}"

echo "=== Mail DNS: ${DOMAIN} (selector=${SELECTOR}) ==="

echo "--- SPF (TXT @ ${DOMAIN}) ---"
dig +short TXT "${DOMAIN}" | tr -d '"' || true

echo "--- DKIM (${SELECTOR}._domainkey.${DOMAIN}) ---"
dig +short TXT "${SELECTOR}._domainkey.${DOMAIN}" | tr -d '"' || true

echo "--- DMARC (_dmarc.${DOMAIN}) ---"
dig +short TXT "_dmarc.${DOMAIN}" | tr -d '"' || true

echo "--- MX ---"
dig +short MX "${DOMAIN}" || true

echo "=== Bitti ==="
