#!/usr/bin/env bash
# www cutover öncesi DNS ve mevcut içerik kontrolü (değişiklik yapmaz).
set -euo pipefail

EXPECTED_IP="${EXPECTED_IP:-168.231.109.27}"
WWW_HOST="${WWW_HOST:-www.lerta.com.tr}"
APEX_HOST="${APEX_HOST:-lerta.com.tr}"
U88_HOST="${U88_HOST:-u88.lerta.com.tr}"
KURUMSAL_HOST="${KURUMSAL_HOST:-kurumsal.lerta.com.tr}"

echo "== Lerta Mail www cutover preflight =="

WWW_A="$(dig +short "${WWW_HOST}" A | head -1 || true)"
APEX_A="$(dig +short "${APEX_HOST}" A | head -1 || true)"
U88_A="$(dig +short "${U88_HOST}" A | head -1 || true)"
echo "${WWW_HOST} A → ${WWW_A:-yok}"
echo "${APEX_HOST} A → ${APEX_A:-yok}"
echo "${U88_HOST} A → ${U88_A:-yok} (U88 taşıma hedefi)"

if [[ "${WWW_A}" == "${EXPECTED_IP}" ]]; then
  echo "OK: www VPS IP ile uyumlu."
else
  echo "NOT: www henüz ${EXPECTED_IP} değil (CNAME apex üzerinden çözülüyor olabilir)."
fi

if [[ -n "${U88_A}" ]]; then
  echo "OK: ${U88_HOST} DNS kaydı var (cutover öncesi U88 vhost test edin)."
else
  echo "NOT: ${U88_HOST} A yok — cutover öncesi DNS + scripts/nginx-u88-lerta-com-tr.sh"
fi

echo ""
echo "== HTTPS başlık (www) =="
WWW_TITLE="$(curl -sS --connect-timeout 8 "https://${WWW_HOST}/" 2>/dev/null | grep -o '<title>[^<]*</title>' || true)"
echo "${WWW_TITLE:-curl başarısız veya title yok}"
if echo "${WWW_TITLE}" | grep -qi 'Lerta Mail'; then
  echo "OK: www zaten Lerta Mail (cutover yapılmış olabilir)."
elif [[ -n "${WWW_TITLE}" ]]; then
  echo "NOT: www hâlâ eski içerik — U88'yi ${U88_HOST}'a taşıyın, sonra apply cutover."
fi

echo ""
echo "== Kurumsal vitrin (hedef içerik örneği) =="
KURUMSAL_TITLE="$(curl -sS --connect-timeout 8 "https://${KURUMSAL_HOST}/" 2>/dev/null | grep -o '<title>[^<]*</title>' || true)"
echo "${KURUMSAL_TITLE:-title alınamadı}"
if echo "${KURUMSAL_TITLE}" | grep -qi 'Lerta Mail'; then
  echo "OK: kurumsal title Lerta Mail içeriyor (A4/A5 vitrin hazır)."
else
  echo "NOT: title içinde 'Lerta Mail' yok — mail-marketing deploy kontrol edin."
fi

echo ""
echo "== Kurumsal smoke (isteğe bağlı) =="
if BASE_URL="https://${KURUMSAL_HOST}" bash "$(dirname "$0")/smoke-www-cutover-lerta-mail.sh" 2>/dev/null; then
  echo "OK: kurumsal vitrin smoke PASS"
else
  echo "NOT: kurumsal smoke FAIL — merge/deploy sonrası tekrar deneyin."
fi

echo ""
echo "== Cutover komutu (U88 taşındıktan sonra) =="
echo "1) DNS: ${U88_HOST} → ${EXPECTED_IP}"
echo "2) sudo bash scripts/nginx-u88-lerta-com-tr.sh"
echo "3) CONFIRM_CUTOVER=yes bash scripts/apply-www-cutover-lerta-mail.sh"
echo "Detay: docs/WWW_CUTOVER_LERTA_MAIL.md"
