#!/usr/bin/env bash
# Kara kutu güvenlik yüzeyi: TLS, güvenlik başlıkları, açık yönetim uçları (read-only).
set -euo pipefail

API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
POSTA="${POSTA_URL:-https://posta.lerta.com.tr}"
APP="${APP_URL:-https://app.lerta.com.tr}"
FAIL=0

check_header() {
  local url="$1"
  local header="$2"
  local expect="$3"
  local val
  val="$(curl -sSI --connect-timeout 12 "${url}" 2>/dev/null | awk -v h="${header}" 'BEGIN{IGNORECASE=1} $1==h":"{sub(/^[^:]*:[ \t]*/,"");print;exit}')"
  if [[ -z "${val}" ]]; then
    echo "WARN: ${url} — ${header} yok"
    FAIL=1
    return
  fi
  if [[ -n "${expect}" ]] && [[ "${val}" != *"${expect}"* ]]; then
    echo "WARN: ${url} — ${header}=${val} (beklenen: ${expect})"
    FAIL=1
    return
  fi
  echo "OK: ${url} ${header}"
}

echo "== QA Security surface =="
echo "API_BASE=${API_BASE}"

check_header "${POSTA}/login" "strict-transport-security" "max-age"
check_header "${POSTA}/login" "x-content-type-options" "nosniff"
check_header "${APP}/login" "strict-transport-security" "max-age"

code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 "${API_BASE}/health" || echo 000)"
echo "GET /health → ${code}"
if [[ "${code}" != "200" ]]; then FAIL=1; fi

for path in company/mail-inbox/messages platform-admin/mail/billing-health; do
  c="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 "${API_BASE}/${path}" || echo 000)"
  if [[ "${c}" == "401" ]] || [[ "${c}" == "403" ]]; then
    echo "OK: ${path} korumalı (${c})"
  else
    echo "WARN: ${path} beklenen 401/403, alındı ${c}"
    FAIL=1
  fi
done

if [[ "${FAIL}" -eq 0 ]]; then
  echo "qa-security-surface: PASS"
  exit 0
fi
echo "qa-security-surface: WARN/FAIL (inceleme gerekli)" >&2
exit 1
