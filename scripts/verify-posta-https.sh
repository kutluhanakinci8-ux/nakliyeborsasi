#!/usr/bin/env bash
# posta.lerta.com.tr TLS ve yönlendirme kontrolü (G0).
set -euo pipefail

HOST="${POSTA_HOST:-posta.lerta.com.tr}"
FAIL=0

echo "== Lerta Posta HTTPS (G0) =="
echo "Host: ${HOST}"

echo ""
echo "== HTTP → HTTPS =="
HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "http://${HOST}/mail" || echo "000")"
echo "http://${HOST}/mail → ${HTTP_CODE}"
if [[ "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" || "$HTTP_CODE" == "308" ]]; then
  echo "OK: HTTP yönlendirme var"
else
  echo "NOT: Beklenen 301/302 (şu an ${HTTP_CODE})" >&2
  FAIL=1
fi

echo ""
echo "== HTTPS sertifika =="
if ! curl -fsS --connect-timeout 12 "https://${HOST}/mail" -o /dev/null 2>/dev/null; then
  echo "FAIL: HTTPS bağlantı veya sertifika hatası (tarayıcıda 'Güvenli değil')" >&2
  FAIL=1
else
  echo "OK: curl HTTPS başarılı"
fi

EXPIRY="$(echo | openssl s_client -servername "$HOST" -connect "${HOST}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || true)"
if [[ -n "$EXPIRY" ]]; then
  echo "Sertifika: ${EXPIRY}"
else
  echo "NOT: openssl sertifika okunamadı" >&2
  FAIL=1
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "G0: PASS"
  exit 0
fi
echo "G0: FAIL — scripts/nginx-posta-lerta-com-tr.sh + certbot" >&2
exit 1
