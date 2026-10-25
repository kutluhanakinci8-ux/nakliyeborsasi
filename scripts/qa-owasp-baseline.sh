#!/usr/bin/env bash
# OWASP surrogate — kara kutu: yaygın açık uçlar, bilgi sızıntısı, auth bypass (read-only).
set -euo pipefail

API_BASE="${API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
POSTA="${POSTA_URL:-https://posta.lerta.com.tr}"
FAIL=0

probe() {
  local path="$1"
  local expect="$2"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 "${API_BASE}${path}" || echo 000)"
  if [[ "${code}" == "${expect}" ]]; then
    echo "OK: ${path} → ${code}"
  else
    echo "WARN: ${path} beklenen ${expect}, alındı ${code}"
    FAIL=1
  fi
}

echo "== QA OWASP baseline (surrogate) =="

probe "/health" "200"
probe "/company/mail-inbox" "401"
probe "/platform-admin/mail/billing-health" "401"

for leak in "/.env" "/api/v1/.env" "/config.json" "/.git/config"; do
  c="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 10 "${POSTA}${leak}" || echo 000)"
  if [[ "${c}" == "404" ]] || [[ "${c}" == "403" ]] || [[ "${c}" == "301" ]] || [[ "${c}" == "302" ]]; then
    echo "OK: ${leak} → ${c}"
  else
    echo "WARN: ${leak} → ${c} (incele)"
    FAIL=1
  fi
done

# Basit SQLi probe — auth öncesi 401 beklenir
sqli_code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 12 \
  "${API_BASE}/company/mail-inbox/search?q='%20OR%201=1--" || echo 000)"
if [[ "${sqli_code}" == "401" ]] || [[ "${sqli_code}" == "403" ]]; then
  echo "OK: SQLi probe korumalı (${sqli_code})"
else
  echo "WARN: SQLi probe ${sqli_code}"
  FAIL=1
fi

if [[ "${FAIL}" -eq 0 ]]; then
  echo "qa-owasp-baseline: PASS"
  exit 0
fi
echo "qa-owasp-baseline: FAIL" >&2
exit 1
