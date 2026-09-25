#!/usr/bin/env bash
# www cutover öncesi DNS ve mevcut içerik kontrolü (değişiklik yapmaz).
set -euo pipefail

EXPECTED_IP="${EXPECTED_IP:-168.231.109.27}"
WWW_HOST="${WWW_HOST:-www.lerta.com.tr}"
APEX_HOST="${APEX_HOST:-lerta.com.tr}"

echo "== Lerta Mail www cutover preflight =="

WWW_A="$(dig +short "${WWW_HOST}" A | head -1 || true)"
APEX_A="$(dig +short "${APEX_HOST}" A | head -1 || true)"
echo "${WWW_HOST} A → ${WWW_A:-yok}"
echo "${APEX_HOST} A → ${APEX_A:-yok}"

if [[ "${WWW_A}" == "${EXPECTED_IP}" ]]; then
  echo "OK: www VPS IP ile uyumlu."
else
  echo "NOT: www henüz ${EXPECTED_IP} değil (CNAME apex üzerinden çözülüyor olabilir)."
fi

echo ""
echo "== HTTPS başlık (www) =="
curl -sS -I --connect-timeout 8 "https://${WWW_HOST}/" 2>/dev/null | head -8 || echo "curl başarısız"

echo ""
echo "== Kurumsal vitrin (hedef içerik örneği) =="
curl -sS --connect-timeout 8 "https://kurumsal.lerta.com.tr/" 2>/dev/null | grep -o '<title>[^<]*</title>' || true

echo ""
echo "== Cutover komutu (U88 taşındıktan sonra) =="
echo "CONFIRM_CUTOVER=yes bash scripts/apply-www-cutover-lerta-mail.sh"
echo "Detay: docs/WWW_CUTOVER_LERTA_MAIL.md"
