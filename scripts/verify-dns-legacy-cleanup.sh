#!/usr/bin/env bash
# Eski kullanici.* / karışık DNS CNAME kayıtlarını tespit eder (okuma).
set -euo pipefail

DOMAIN="${1:-lerta.com.tr}"
LEGACY_PREFIXES=("kullanici." "user." "eski." "legacy.")

echo "== DNS legacy prefix scan: ${DOMAIN} =="
fail=0
for prefix in "${LEGACY_PREFIXES[@]}"; do
  host="${prefix}${DOMAIN}"
  if dig +short "${host}" A 2>/dev/null | grep -q .; then
    echo "WARN: ${host} A kaydı hâlâ yayında"
    fail=1
  fi
  if dig +short "${host}" CNAME 2>/dev/null | grep -q .; then
    echo "WARN: ${host} CNAME kaydı hâlâ yayında"
    fail=1
  fi
done

echo "Beklenen: posta → posta.lerta.com.tr · yonetim → konsol · mail MX → mail.lerta.com.tr"
if [[ "$fail" -eq 0 ]]; then
  echo "OK: bilinen legacy prefix yok"
else
  echo "NOT: docs/MAIL_DNS_LEGACY_CLEANUP.md ile temizleyin" >&2
  exit 1
fi
