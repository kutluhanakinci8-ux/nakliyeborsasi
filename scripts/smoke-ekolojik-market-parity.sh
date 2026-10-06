#!/usr/bin/env bash
# Ekolojik Market — NB iletişim paritesi public smoke (secret gerekmez).
set -euo pipefail
API_BASE="${EKOLojIK_API_BASE:-${SOCIAL_HUB_API_BASE:-http://127.0.0.1:3000/api/v1}}"
WEB_BASE="${EKOLojIK_WEB_PUBLIC_URL:-${SOCIAL_HUB_WEB_PUBLIC_URL:-http://127.0.0.1:3001}}"
EXPECT_PHASE="${EKOLOJIK_SMOKE_EXPECT_PHASE:-ek-m8}"

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
echo "${status_json}" | grep -q '"ekolojik_messaging_interactions_parity"' || {
  echo "FAIL: missing ekolojik_messaging_interactions_parity"
  exit 1
}
echo "OK: feature ekolojik_messaging_interactions_parity (EK-M3)"
echo "${status_json}" | grep -q '"message_edit_delete"' || {
  echo "FAIL: missing messagingInteractions message_edit_delete"
  exit 1
}
echo "OK: messagingInteractions parity list"
echo "${status_json}" | grep -q '"ekolojik_messaging_attachments_audit_hold"' || {
  echo "FAIL: missing ekolojik_messaging_attachments_audit_hold"
  exit 1
}
echo "OK: feature ekolojik_messaging_attachments_audit_hold (EK-M4)"
echo "${status_json}" | grep -q '"maxCount":5' || {
  echo "FAIL: missing messagingAttachments maxCount 5"
  exit 1
}
echo "OK: messagingAttachments 5x10MB policy"
echo "${status_json}" | grep -q '"thread_legal_hold"' || {
  echo "FAIL: missing messagingCompliance thread_legal_hold"
  exit 1
}
echo "OK: messagingCompliance audit/hold"
echo "${status_json}" | grep -q '"ekolojik_messaging_social_dm_bridge"' || {
  echo "FAIL: missing ekolojik_messaging_social_dm_bridge"
  exit 1
}
echo "OK: feature ekolojik_messaging_social_dm_bridge (EK-M5)"
echo "${status_json}" | grep -q '"hubSection":"sosyal-dm"' || {
  echo "FAIL: missing messagingSocialDm hubSection"
  exit 1
}
echo "OK: messagingSocialDm hub path"
echo "${status_json}" | grep -q '"ekolojik_messaging_whatsapp_bridge_fs12"' || {
  echo "FAIL: missing ekolojik_messaging_whatsapp_bridge_fs12"
  exit 1
}
echo "OK: feature ekolojik_messaging_whatsapp_bridge_fs12 (EK-M6)"
echo "${status_json}" | grep -q '"phaseCode":"fs-12"' || {
  echo "FAIL: missing messagingWhatsappBridge fs-12"
  exit 1
}
echo "OK: messagingWhatsappBridge FS-12"
echo "${status_json}" | grep -q '"ekolojik_messaging_public_api_slack_zapier"' || {
  echo "FAIL: missing ekolojik_messaging_public_api_slack_zapier"
  exit 1
}
echo "OK: feature ekolojik_messaging_public_api_slack_zapier (EK-M7)"
echo "${status_json}" | grep -q '"hubSection":"entegrasyon"' || {
  echo "FAIL: missing messagingIntegrations hubSection"
  exit 1
}
echo "OK: messagingIntegrations hub"
echo "${status_json}" | grep -q '"ekolojik_messaging_group_threads_roles"' || {
  echo "FAIL: missing ekolojik_messaging_group_threads_roles"
  exit 1
}
echo "OK: feature ekolojik_messaging_group_threads_roles (EK-M8)"
echo "${status_json}" | grep -q '"hubSection":"grup-sohbet"' || {
  echo "FAIL: missing messagingGroupThreads hubSection"
  exit 1
}
echo "OK: messagingGroupThreads hub"

echo "== Ekolojik hub web route =="
code="$(curl -sS -o /dev/null -w "%{http_code}" "${WEB_BASE}/marketim/posta-ve-mesaj")"
if [[ "${code}" != "200" && "${code}" != "307" ]]; then
  echo "FAIL: /marketim/posta-ve-mesaj HTTP ${code}"
  exit 1
fi
echo "OK: hub route HTTP ${code}"

echo "smoke-ekolojik-market-parity: PASS"
