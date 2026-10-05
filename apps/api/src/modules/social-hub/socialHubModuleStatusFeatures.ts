/**
 * Public /status feature bayrakları. Faz AZ: tekrarlayan yol haritası iskelet bayrakları
 * prod milestone bayraklarıyla birleştirildi; faz smoke bayrakları (AO–AY) korunur.
 */
const CORE_FEATURES = [
  "connections_skeleton",
  "inbox_bridge_messaging",
  "demo_inbox_seed",
  "publishing_approval_schedule",
  "publish_scheduler_job",
  "team_social_admin_roles",
  "audit_log",
  "analytics_snapshot",
  "subscription_gate",
  "meta_oauth_callback",
  "linkedin_oauth_callback",
  "meta_whatsapp_webhooks",
  "oauth_token_vault",
  "webhook_to_messaging_bridge",
  "meta_page_routing",
  "graph_feed_publish",
  "webhook_message_dedup",
  "linkedin_ugc_publish",
  "meta_messenger_history_sync",
  "prod_schema_apply_script",
  "whatsapp_outbound_cloud_api",
  "instagram_dm_outbound",
  "messaging_outbound_bridge",
  "instagram_dm_history_sync",
  "smoke_ci_workflow",
  "oauth_provider_polish",
  "connection_setup_warnings",
  "outbound_delivery_ui",
  "connection_health_dashboard",
  "meta_token_refresh",
  "token_refresh_scheduler",
  "outbound_delivery_log",
  "delivery_history_ui",
  "linkedin_refresh_token",
  "health_alerts_slack_email",
  "delivery_log_filters_export",
  "social_hub_health_email_template",
  "health_alert_thresholds",
  "social_hub_dedicated_slack",
  "outbound_delivery_body_preview",
  "outbound_failure_slack",
  "slack_webhook_validation",
  "slack_test_ping",
  "outbound_failure_slack_dedup",
  "delivery_log_messaging_deep_link",
  "slack_daily_digest",
  "delivery_log_thread_label",
  "slack_digest_manual_send",
  "slack_digest_recent_failures",
  "health_alert_slack_dedup",
  "slack_digest_business_hours",
  "slack_notification_insights",
  "digest_outbound_success_stats",
  "channel_outbound_success_rates",
  "notification_insights_csv",
  "weekly_email_digest",
  "weekly_email_manual_send",
  "channel_outbound_7d_stats",
  "channel_outbound_30d_stats",
  "manual_notify_cooldown",
  "slack_digest_7d_channel_rates",
  "roadmap_channel_interest",
  "weekly_email_30d_summary",
  "slack_digest_30d_channel_rates",
  "roadmap_interest_digest_summaries",
  "roadmap_oauth_env_readiness",
  "platform_admin_roadmap_interest_stats",
  "roadmap_oauth_connect_flow",
  "roadmap_token_refresh",
  "roadmap_token_refresh_job",
  "health_roadmap_beta_channels",
  "integration_webhook_urls_snapshot",
  "tiktok_webhook_signature_verify",
  "youtube_pubsub_push_decode",
  "tiktok_webhook_signature_required_mode",
  "youtube_pubsub_push_auth_verify",
  "youtube_webhook_push_auth_required_mode",
  "integration_webhook_readiness_snapshot",
  "roadmap_health_open_threads",
  "youtube_webhook_oidc_audience_beta",
  "platform_admin_roadmap_beta_ops",
  "delivery_log_roadmap_platform_filters",
  "roadmap_dynamic_capabilities",
  "slack_digest_roadmap_beta_ops",
  "weekly_email_roadmap_beta_ops",
  "insights_roadmap_beta_outbound_24h",
  "public_status_webhook_readiness",
  "health_alerts_roadmap_channels",
  "webhook_post_http_200",
  "youtube_webhook_oidc_issuer_beta",
  "platform_admin_roadmap_beta_ops_csv",
  "insights_roadmap_beta_channel_health",
  "roadmap_inbox_sync_summarize",
  "webhook_inbound_body_dedup_window",
  "public_status_integration_webhooks",
  "platform_admin_roadmap_interest_csv",
  "webhook_bridge_audit_log",
  "roadmap_inbox_sync_audit",
  "integration_ops_hints_snapshot",
  "admin_webhook_bridged_24h_metric",
  "meta_webhook_bridge_audit",
  "hub_webhook_activity_snapshot",
  "notification_insights_webhook_bridged_24h",
  "slack_digest_webhook_bridge_stats",
  "audit_log_webhook_focus_filter",
  "platform_admin_webhook_bridge_audit_csv",
  "hub_webhook_activity_by_platform",
  "weekly_email_webhook_bridge_clause",
  "public_status_webhook_bridge_24h",
  "notification_insights_webhook_by_platform",
  "admin_webhook_bridged_by_platform_24h",
  "audit_log_webhook_filter_ui",
  "health_channel_webhook_bridged_24h",
  "health_alerts_webhook_bridge_summary",
  "company_webhook_activity_csv_export",
  "webhook_inactivity_health_hint_env",
  "analytics_webhook_bridge_snapshot",
  "analytics_webhook_csv_export",
  "inbox_summary_webhook_bridged_24h",
  "public_status_webhook_companies_active_24h",
  "admin_webhook_active_companies_24h",
  "inbox_by_platform_webhook_bridged_24h",
  "analytics_webhook_30d_and_7d_platform",
  "analytics_utm_campaign_snapshot",
  "publishing_utm_link_tags",
  "company_audit_log_csv_export",
  "public_status_webhook_bridge_7d",
  "admin_webhook_bridged_7d_metrics",
  "tiktok_webhook_prod_stack",
  "youtube_webhook_prod_stack",
] as const;

/** Faz smoke ile doğrulanan milestone bayrakları (AO → AY). */
const PHASE_MILESTONE_FEATURES = [
  "analytics_meta_platform_insights",
  "analytics_linkedin_org_insights",
  "inbox_threads_preview_panel",
  "inbox_sync_summary_by_platform",
  "publishing_media_upload_graph",
  "publishing_calendar_grid",
  "templates_variables_render_preview",
  "messaging_quick_reply_template_render",
  "tiktok_prod_provider_path",
  "youtube_prod_provider_path",
  "linkedin_dm_v2_explicit_gate",
  "roadmap_pending_x_google_business",
] as const;

const AZ_FEATURES = ["social_hub_code_complete_az"] as const;

const BA_FEATURES = [
  "social_hub_mock_webhook_fixtures",
  "social_hub_ci_workflow_ba",
] as const;

const BB_FEATURES = [
  "social_hub_pwa_manifest_scope",
  "social_hub_health_push_hook_skeleton",
] as const;

const BC_FEATURES = [
  "social_hub_integration_gate_checklist",
  "social_hub_post_code_integration_bc",
] as const;

const BD_FEATURES = [
  "social_hub_telegram_track_complete",
  "social_hub_ci_workflow_bd",
] as const;

const BE_FEATURES = [
  "social_hub_campaign_landing_publish",
  "social_hub_messaging_attachment_s3_status",
  "social_hub_ci_workflow_be",
] as const;

const BF_FEATURES = [
  "social_hub_messaging_s3_prod_probe",
  "social_hub_ci_workflow_bf",
] as const;

const BG_FEATURES = [
  "social_hub_telegram_outbound_media_group",
  "social_hub_ci_workflow_bg",
] as const;

const BH_FEATURES = [
  "social_hub_telegram_channel_media_group",
  "social_hub_ci_workflow_bh",
] as const;

const BI_FEATURES = [
  "social_hub_telegram_edited_message_sync",
  "social_hub_ci_workflow_bi",
] as const;

const BJ_FEATURES = [
  "social_hub_telegram_flood_retry",
  "social_hub_ci_workflow_bj",
] as const;

export const SOCIAL_HUB_PHASE_MILESTONE_CODES = [
  "ao",
  "ap",
  "aq",
  "ar",
  "as",
  "at",
  "au",
  "av",
  "aw",
  "ax",
  "ay",
  "az",
  "ba",
  "bb",
  "bc",
  "bd",
  "be",
  "bf",
  "bg",
  "bh",
  "bi",
  "bj",
] as const;

export function buildSocialHubModuleStatusFeatures(): string[] {
  return [
    ...CORE_FEATURES,
    ...PHASE_MILESTONE_FEATURES,
    ...AZ_FEATURES,
    ...BA_FEATURES,
    ...BB_FEATURES,
    ...BC_FEATURES,
    ...BD_FEATURES,
    ...BE_FEATURES,
    ...BF_FEATURES,
    ...BG_FEATURES,
    ...BH_FEATURES,
    ...BI_FEATURES,
    ...BJ_FEATURES,
  ];
}
