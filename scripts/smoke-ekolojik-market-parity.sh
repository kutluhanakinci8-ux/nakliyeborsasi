#!/usr/bin/env bash
# Ekolojik Market — NB iletişim paritesi public smoke (secret gerekmez).
set -euo pipefail
API_BASE="${EKOLojIK_API_BASE:-${SOCIAL_HUB_API_BASE:-http://127.0.0.1:3000/api/v1}}"
WEB_BASE="${EKOLojIK_WEB_PUBLIC_URL:-${SOCIAL_HUB_WEB_PUBLIC_URL:-http://127.0.0.1:3001}}"
EXPECT_PHASE="${EKOLOJIK_SMOKE_EXPECT_PHASE:-ek-u4}"

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
echo "${status_json}" | grep -q '"ekolojik_mail_rich_compose_templates_multipart"' || {
  echo "FAIL: missing ekolojik_mail_rich_compose_templates_multipart"
  exit 1
}
echo "OK: feature ekolojik_mail_rich_compose_templates_multipart (EK-P2)"
echo "${status_json}" | grep -q '"composeTemplate=builtin:yuk-teklifi"' || {
  echo "FAIL: missing mailComposeRich template deep link"
  exit 1
}
echo "OK: mailComposeRich embed deep links"
echo "${status_json}" | grep -q '"composeMultipart=1"' || {
  echo "FAIL: missing mailComposeRich multipart deep link"
  exit 1
}
echo "OK: mailComposeRich multipart handoff"
echo "${status_json}" | grep -q '"ekolojik_mail_accounts_alias_dns_hub"' || {
  echo "FAIL: missing ekolojik_mail_accounts_alias_dns_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_accounts_alias_dns_hub (EK-P3)"
echo "${status_json}" | grep -q '"mailSettings=accounts"' || {
  echo "FAIL: missing mailAccountsDnsHub accounts path"
  exit 1
}
echo "OK: mailAccountsDnsHub accounts deep link"
echo "${status_json}" | grep -q '"mailSettings=deliverability"' || {
  echo "FAIL: missing mailAccountsDnsHub DNS path"
  exit 1
}
echo "OK: mailAccountsDnsHub deliverability deep link"
echo "${status_json}" | grep -q '"ekolojik_mail_rules_swipe_bulk"' || {
  echo "FAIL: missing ekolojik_mail_rules_swipe_bulk"
  exit 1
}
echo "OK: feature ekolojik_mail_rules_swipe_bulk (EK-P5)"
echo "${status_json}" | grep -q '"mailSettings=rules"' || {
  echo "FAIL: missing mailRulesSwipeBulk rules path"
  exit 1
}
echo "${status_json}" | grep -q '"mailBulk=1"' || {
  echo "FAIL: missing mailRulesSwipeBulk bulk path"
  exit 1
}
echo "${status_json}" | grep -q '"mailSwipe=1"' || {
  echo "FAIL: missing mailRulesSwipeBulk swipe path"
  exit 1
}
echo "OK: mailRulesSwipeBulk deep links"
echo "${status_json}" | grep -q '"ekolojik_mail_caldav_carddav_hub"' || {
  echo "FAIL: missing ekolojik_mail_caldav_carddav_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_caldav_carddav_hub (EK-P6)"
echo "${status_json}" | grep -q '"mailView=calendar"' || {
  echo "FAIL: missing mailCalDavCardDav calDav path"
  exit 1
}
echo "${status_json}" | grep -q '"mailSettings=calendarSettings"' || {
  echo "FAIL: missing mailCalDavCardDav calendarSettings"
  exit 1
}
echo "${status_json}" | grep -q '"mailView=contacts"' || {
  echo "FAIL: missing mailCalDavCardDav cardDav path"
  exit 1
}
echo "${status_json}" | grep -q '"mailSettings=contactsSettings"' || {
  echo "FAIL: missing mailCalDavCardDav contactsSettings"
  exit 1
}
echo "OK: mailCalDavCardDav deep links"
echo "${status_json}" | grep -q '"ekolojik_mail_deliverability_dmarc_hub"' || {
  echo "FAIL: missing ekolojik_mail_deliverability_dmarc_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_deliverability_dmarc_hub (EK-P7)"
echo "${status_json}" | grep -q '"mailDmarc=1"' || {
  echo "FAIL: missing mailDeliverabilityDmarc dmarc panel path"
  exit 1
}
echo "${status_json}" | grep -q 'deliverability-hub' || {
  echo "FAIL: missing mailDeliverabilityDmarc API path"
  exit 1
}
echo "OK: mailDeliverabilityDmarc deep links"
echo "${status_json}" | grep -q '"ekolojik_mail_pwa_offline_push_hub"' || {
  echo "FAIL: missing ekolojik_mail_pwa_offline_push_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_pwa_offline_push_hub (EK-P8)"
echo "${status_json}" | grep -q '"mailPwa=1"' || {
  echo "FAIL: missing mailPwaOfflinePush pwa panel path"
  exit 1
}
echo "${status_json}" | grep -q '"mailSettings=notifications"' || {
  echo "FAIL: missing mailPwaOfflinePush notifications settings"
  exit 1
}
echo "${status_json}" | grep -q 'mail_web_pwa_manifest_scope' || {
  echo "FAIL: missing mail PWA nb feature"
  exit 1
}
echo "OK: mailPwaOfflinePush deep links + NB PWA refs"
echo "${status_json}" | grep -q '"ekolojik_mail_ai_compose_hub"' || {
  echo "FAIL: missing ekolojik_mail_ai_compose_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_ai_compose_hub (EK-P9)"
echo "${status_json}" | grep -q '"composeAi=1"' || {
  echo "FAIL: missing mailAiCompose hub path"
  exit 1
}
echo "${status_json}" | grep -q 'compose/suggest-draft' || {
  echo "FAIL: missing mailAiCompose suggest-draft API path"
  exit 1
}
echo "OK: mailAiCompose deep links (optional LLM)"
echo "${status_json}" | grep -q '"ekolojik_mail_engagement_webhook_analytics_hub"' || {
  echo "FAIL: missing ekolojik_mail_engagement_webhook_analytics_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_engagement_webhook_analytics_hub (EK-P10)"
echo "${status_json}" | grep -q '"mailEngagement=1"' || {
  echo "FAIL: missing mailEngagementWebhook engagement panel path"
  exit 1
}
echo "${status_json}" | grep -q 'message.opened' || {
  echo "FAIL: missing mailEngagementWebhook engagement events"
  exit 1
}
echo "OK: mailEngagementWebhook deep links"
echo "${status_json}" | grep -q '"ekolojik_mail_ops_snapshot_runbook_hub"' || {
  echo "FAIL: missing ekolojik_mail_ops_snapshot_runbook_hub"
  exit 1
}
echo "OK: feature ekolojik_mail_ops_snapshot_runbook_hub (EK-P11)"
echo "${status_json}" | grep -q '"mailSettings=ops"' || {
  echo "FAIL: missing mailOpsSnapshotRunbook ops panel path"
  exit 1
}
echo "${status_json}" | grep -q 'ops-snapshot' || {
  echo "FAIL: missing mailOpsSnapshotRunbook API path"
  exit 1
}
echo "${status_json}" | grep -q 'MESSAGING_POSTA_OPS_RUNBOOK' || {
  echo "FAIL: missing mailOpsSnapshotRunbook runbook ref"
  exit 1
}
echo "OK: mailOpsSnapshotRunbook deep links"
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
echo "${status_json}" | grep -q '"ekolojik_messaging_push_translate_notify_matrix"' || {
  echo "FAIL: missing ekolojik_messaging_push_translate_notify_matrix"
  exit 1
}
echo "OK: feature ekolojik_messaging_push_translate_notify_matrix (EK-M9)"
echo "${status_json}" | grep -q '"hubSection":"bildirimler"' || {
  echo "FAIL: missing messagingNotifications hubSection"
  exit 1
}
echo "OK: messagingNotifications hub"
echo "${status_json}" | grep -q '"ekolojik_messaging_kvkk_export_retention"' || {
  echo "FAIL: missing ekolojik_messaging_kvkk_export_retention"
  exit 1
}
echo "OK: feature ekolojik_messaging_kvkk_export_retention (EK-M10)"
echo "${status_json}" | grep -q '"hubSection":"kvkk"' || {
  echo "FAIL: missing messagingKvkkRetention hubSection"
  exit 1
}
echo "OK: messagingKvkkRetention hub"
echo "${status_json}" | grep -q '"ekolojik_messaging_premium_ui_rail"' || {
  echo "FAIL: missing ekolojik_messaging_premium_ui_rail"
  exit 1
}
echo "OK: feature ekolojik_messaging_premium_ui_rail (EK-M11)"
echo "${status_json}" | grep -q '"phaseCode":"ek-m11"' || {
  echo "FAIL: missing messagingPremiumUi phaseCode ek-m11"
  exit 1
}
echo "OK: messagingPremiumUi rail parity"
echo "${status_json}" | grep -q '"ekolojik_social_hub_connections_oauth"' || {
  echo "FAIL: missing ekolojik_social_hub_connections_oauth"
  exit 1
}
echo "OK: feature ekolojik_social_hub_connections_oauth (EK-S2)"
echo "${status_json}" | grep -q '"hubSection":"sosyal"' || {
  echo "FAIL: missing socialHubConnections hubSection"
  exit 1
}
echo "OK: socialHubConnections OAuth return path"
echo "${status_json}" | grep -q '"ekolojik_social_hub_inbox_sync_summary"' || {
  echo "FAIL: missing ekolojik_social_hub_inbox_sync_summary"
  exit 1
}
echo "OK: feature ekolojik_social_hub_inbox_sync_summary (EK-S3)"
echo "${status_json}" | grep -q '"hubTab":"inbox"' || {
  echo "FAIL: missing socialHubInbox hubTab inbox"
  exit 1
}
echo "OK: socialHubInbox hub deep link"
echo "${status_json}" | grep -q '"ekolojik_social_hub_publishing_utm_media"' || {
  echo "FAIL: missing ekolojik_social_hub_publishing_utm_media"
  exit 1
}
echo "OK: feature ekolojik_social_hub_publishing_utm_media (EK-S4)"
echo "${status_json}" | grep -q '"hubTab":"publishing"' || {
  echo "FAIL: missing socialHubPublishing hubTab publishing"
  exit 1
}
echo "OK: socialHubPublishing UTM + media paths"
echo "${status_json}" | grep -q '"ekolojik_social_hub_templates"' || {
  echo "FAIL: missing ekolojik_social_hub_templates"
  exit 1
}
echo "OK: feature ekolojik_social_hub_templates (EK-S5)"
echo "${status_json}" | grep -q '"hubTab":"templates"' || {
  echo "FAIL: missing socialHubTemplates hubTab templates"
  exit 1
}
echo "OK: socialHubTemplates deep link + API paths"
echo "${status_json}" | grep -q '"ekolojik_social_hub_analytics"' || {
  echo "FAIL: missing ekolojik_social_hub_analytics"
  exit 1
}
echo "OK: feature ekolojik_social_hub_analytics (EK-S6)"
echo "${status_json}" | grep -q '"hubTab":"analytics"' || {
  echo "FAIL: missing socialHubAnalytics hubTab analytics"
  exit 1
}
echo "OK: socialHubAnalytics export + UTM highlight"
echo "${status_json}" | grep -q '"ekolojik_social_hub_telegram_bd_bl"' || {
  echo "FAIL: missing ekolojik_social_hub_telegram_bd_bl"
  exit 1
}
echo "OK: feature ekolojik_social_hub_telegram_bd_bl (EK-S7)"
echo "${status_json}" | grep -q '"social_hub_telegram_webhook_allowed_updates"' || {
  echo "FAIL: missing socialHubTelegram nb BL feature"
  exit 1
}
echo "OK: socialHubTelegram NB BD–BL parity refs"
echo "${status_json}" | grep -q '"ekolojik_social_hub_ops_integration_gate"' || {
  echo "FAIL: missing ekolojik_social_hub_ops_integration_gate"
  exit 1
}
echo "OK: feature ekolojik_social_hub_ops_integration_gate (EK-S8)"
echo "${status_json}" | grep -q '"hubTab":"health"' || {
  echo "FAIL: missing socialHubOps health tab"
  exit 1
}
echo "OK: socialHubOps health deep link"
echo "${status_json}" | grep -q '"social_hub_integration_gate_checklist"' || {
  echo "FAIL: missing socialHubIntegrationGate nb feature"
  exit 1
}
echo "OK: socialHubIntegrationGate BC parity"
echo "${status_json}" | grep -q '"ekolojik_social_hub_tiktok_youtube_pwa"' || {
  echo "FAIL: missing ekolojik_social_hub_tiktok_youtube_pwa"
  exit 1
}
echo "OK: feature ekolojik_social_hub_tiktok_youtube_pwa (EK-S9)"
echo "${status_json}" | grep -q '"platform=TIKTOK"' || {
  echo "FAIL: missing socialHubBetaPlatforms TIKTOK hub path"
  exit 1
}
echo "OK: socialHubBetaPlatforms AV/AW deep links"
echo "${status_json}" | grep -q '"tiktok_prod_provider_path"' || {
  echo "FAIL: missing socialHubBetaPlatforms nb tiktok feature"
  exit 1
}
echo "${status_json}" | grep -q '"tab=health&pwa=1"' || {
  echo "FAIL: missing socialHubPwa health deep link"
  exit 1
}
echo "OK: socialHubPwa BB manifest + push hook refs"
echo "${status_json}" | grep -q '"social_hub_pwa_manifest_scope"' || {
  echo "FAIL: missing socialHubPwa nb feature"
  exit 1
}
echo "${status_json}" | grep -q '"ekolojik_social_hub_telegram_ads_api"' || {
  echo "FAIL: missing ekolojik_social_hub_telegram_ads_api"
  exit 1
}
echo "OK: feature ekolojik_social_hub_telegram_ads_api (EK-S10)"
echo "${status_json}" | grep -q '"telegram_ads=1"' || {
  echo "FAIL: missing socialHubTelegramAds publishing deep link"
  exit 1
}
echo "OK: socialHubTelegramAds deep link"
echo "${status_json}" | grep -q '"social_hub_telegram_ads_api_explicit_gate"' || {
  echo "FAIL: missing socialHubTelegramAds nb explicit gate feature"
  exit 1
}
echo "OK: socialHubTelegramAds explicit v2 gate"
echo "${status_json}" | grep -q '"ekolojik_parity_close_checklist"' || {
  echo "FAIL: missing ekolojik_parity_close_checklist"
  exit 1
}
echo "OK: feature ekolojik_parity_close_checklist (EK-U4)"
echo "${status_json}" | grep -q 'ekolojik-market-parity.yml' || {
  echo "FAIL: missing ekolojikCi workflow path"
  exit 1
}
echo "OK: ekolojikCi workflow (EK-0)"
echo "${status_json}" | grep -q 'verify-ekolojik-market-status-source.sh' || {
  echo "FAIL: missing ekolojikCi statusSourceVerifyScript"
  exit 1
}
echo "OK: ekolojikCi status source verify (EK-OPS)"
echo "${status_json}" | grep -q 'verify-ekolojik-market-roll-manifest.sh' || {
  echo "FAIL: missing ekolojikCi rollManifestVerifyScript"
  exit 1
}
echo "OK: ekolojikCi roll manifest (EK-ROLL)"
echo "${status_json}" | grep -q 'verify-ekolojik-market-phase-pr-cleanup.sh' || {
  echo "FAIL: missing ekolojikCi phasePrCleanupVerifyScript"
  exit 1
}
echo "OK: ekolojikCi phase PR cleanup (EK-CLEAN)"
echo "${status_json}" | grep -q 'run-ekolojik-market-close-stale-phase-prs.sh' || {
  echo "FAIL: missing ekolojikCi phasePrCloseScript"
  exit 1
}
echo "${status_json}" | grep -q '"phasePrCloseEnvVar":"EK_CLOSE_STALE_PRS"' || {
  echo "FAIL: missing phasePrCloseEnvVar EK_CLOSE_STALE_PRS"
  exit 1
}
echo "OK: ekolojikCi stale PR close (EK-CLOSE)"
echo "${status_json}" | grep -q '"ekolojik_program_done_gate"' || {
  echo "FAIL: missing ekolojik_program_done_gate feature"
  exit 1
}
echo "OK: program done feature (EK-DONE)"
echo "${status_json}" | grep -q '"programComplete":true' || {
  echo "FAIL: parityClose.programDone.programComplete not true"
  exit 1
}
echo "${status_json}" | grep -q 'verify-ekolojik-market-program-done.sh' || {
  echo "FAIL: missing programDone.verifyScript"
  exit 1
}
echo "OK: parityClose programDone manifest (EK-DONE)"
echo "${status_json}" | grep -q '"canonicalMergeBranch":"main"' || {
  echo "FAIL: ekolojikCi.canonicalMergeBranch not main"
  exit 1
}
echo "${status_json}" | grep -q '"mergedCanonicalPullRequest":341' || {
  echo "FAIL: missing mergedCanonicalPullRequest 341"
  exit 1
}
echo "OK: ekolojikCi ship metadata (EK-SHIP)"
echo "${status_json}" | grep -q '"phaseCode":"ek-u4"' || {
  echo "FAIL: missing parityClose phaseCode ek-u4"
  exit 1
}
echo "OK: parityClose rubric block"
echo "${status_json}" | grep -q '"mailParityPercent":96' || {
  echo "FAIL: missing mailParityPercent 96"
  exit 1
}
echo "${status_json}" | grep -q '"messagingParityPercent":96' || {
  echo "FAIL: missing messagingParityPercent 96"
  exit 1
}
echo "OK: mail/messaging rubric ≥95% targets"
echo "${status_json}" | grep -q '"socialHubBcChecklistMet":true' || {
  echo "FAIL: socialHubBcChecklistMet not true"
  exit 1
}
echo "OK: social BC checklist rubric"
echo "${status_json}" | grep -q 'run-ekolojik-market-parity-close-checklist.sh' || {
  echo "FAIL: missing close checklist script ref"
  exit 1
}
echo "OK: EK-U4 close checklist script ref"
echo "${status_json}" | grep -q '"fullGateEnvVar":"EK_U4_FULL"' || {
  echo "FAIL: missing parityClose.fullGateEnvVar EK_U4_FULL"
  exit 1
}
echo "OK: parityClose full gate env (EK-FULL)"
echo "${status_json}" | grep -q 'run-ekolojik-market-post-deploy-gate.sh' || {
  echo "FAIL: missing parityClose.postDeployGateScript"
  exit 1
}
echo "OK: parityClose post-deploy gate (EK-LIVE)"

echo "== Ekolojik hub web route =="
code="$(curl -sS -o /dev/null -w "%{http_code}" "${WEB_BASE}/marketim/posta-ve-mesaj")"
if [[ "${code}" != "200" && "${code}" != "307" ]]; then
  echo "FAIL: /marketim/posta-ve-mesaj HTTP ${code}"
  exit 1
fi
echo "OK: hub route HTTP ${code}"

echo "smoke-ekolojik-market-parity: PASS"
