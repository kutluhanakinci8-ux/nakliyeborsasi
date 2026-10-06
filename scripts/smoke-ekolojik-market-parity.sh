#!/usr/bin/env bash
# Ekolojik Market — NB iletişim paritesi public smoke (secret gerekmez).
set -euo pipefail
API_BASE="${EKOLojIK_API_BASE:-${SOCIAL_HUB_API_BASE:-http://127.0.0.1:3000/api/v1}}"
WEB_BASE="${EKOLojIK_WEB_PUBLIC_URL:-${SOCIAL_HUB_WEB_PUBLIC_URL:-http://127.0.0.1:3001}}"
EXPECT_PHASE="${EKOLOJIK_SMOKE_EXPECT_PHASE:-ek-m2}"

echo "== Ekolojik market public status =="
status_json="$(curl -fsS "${API_BASE}/public/ekolojik-market/status")"
echo "${status_json}" | grep -q "\"phase\":\"${EXPECT_PHASE}\"" || {
  echo "FAIL: phase not ${EXPECT_PHASE}"
  echo "${status_json}"
  exit 1
}
echo "OK: phase ${EXPECT_PHASE}"
echo "${status_json}" | grep -q '"ekolojik_communications_hub_unified"' || {
  echo "FAIL: missing ekolojik_communications_hub_unified"
  exit 1
}
echo "OK: feature ekolojik_communications_hub_unified"
echo "${status_json}" | grep -q '"ekolojik_mail_folder_deep_link"' || {
  echo "FAIL: missing ekolojik_mail_folder_deep_link"
  exit 1
}
echo "OK: feature ekolojik_mail_folder_deep_link (EK-P4)"
echo "${status_json}" | grep -q '"ekolojik_messaging_sse_redis_fanout"' || {
  echo "FAIL: missing ekolojik_messaging_sse_redis_fanout"
  exit 1
}
echo "OK: feature ekolojik_messaging_sse_redis_fanout (EK-M2)"
echo "${status_json}" | grep -q '"transport":"sse_redis_fanout"' || {
  echo "FAIL: missing messagingRealtime.transport sse_redis_fanout"
  exit 1
}
echo "OK: messagingRealtime sse_redis_fanout"

echo "== Ekolojik hub web route =="
code="$(curl -sS -o /dev/null -w "%{http_code}" "${WEB_BASE}/marketim/posta-ve-mesaj")"
if [[ "${code}" != "200" && "${code}" != "307" ]]; then
  echo "FAIL: /marketim/posta-ve-mesaj HTTP ${code}"
  exit 1
fi
echo "OK: hub route HTTP ${code}"

echo "smoke-ekolojik-market-parity: PASS"
