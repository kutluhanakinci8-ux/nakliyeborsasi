#!/usr/bin/env bash
# Entegrasyon smoke — canlı API health + ready (read-only, üretim dostu).
set -euo pipefail

BASE="${QA_API_BASE:-https://yonetim.lerta.com.tr/api/v1}"
TIMEOUT="${QA_API_TIMEOUT_SEC:-20}"

fetch() {
  local path="$1"
  curl -fsS --connect-timeout "${TIMEOUT}" --max-time "${TIMEOUT}" \
    -o /tmp/qa-api-body.json -w "%{http_code}" "${BASE}${path}"
}

echo "== QA API integration smoke base=${BASE} =="

code="$(fetch /health)"
body="$(cat /tmp/qa-api-body.json)"
if [[ "${code}" != "200" ]] || [[ "${body}" != *"ok"* ]]; then
  echo "FAIL: GET /health → ${code} ${body}" >&2
  exit 1
fi
echo "OK: GET /health → 200"

code="$(fetch /health/live)"
if [[ "${code}" != "200" ]]; then
  echo "FAIL: GET /health/live → ${code}" >&2
  exit 1
fi
echo "OK: GET /health/live → 200"

code="$(fetch /health/ready)"
if [[ "${code}" != "200" ]]; then
  echo "FAIL: GET /health/ready → ${code} (DB bağlantısı)" >&2
  exit 1
fi
echo "OK: GET /health/ready → 200"

code="$(curl -sS --connect-timeout "${TIMEOUT}" --max-time "${TIMEOUT}" \
  -o /dev/null -w "%{http_code}" "${BASE}/company/mail-inbox" || echo "000")"
if [[ "${code}" != "401" && "${code}" != "403" ]]; then
  echo "FAIL: korumalı uç beklenen 401/403, alındı ${code}" >&2
  exit 1
fi
echo "OK: GET /company/mail-inbox → ${code} (auth gerekli)"

echo "qa-api-integration-smoke: PASS"
