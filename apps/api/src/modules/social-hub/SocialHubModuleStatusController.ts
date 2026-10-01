import { Controller, Get } from "@nestjs/common";
import { SubscriptionModuleCode } from "@nakliyeborsasi/core";
import { buildSocialHubIntegrationWebhookReadiness } from "./socialHubIntegrationWebhookReadiness";
import { buildSocialHubPublicWebhookUrls } from "./socialHubIntegrationUrls";
import { buildSocialHubIntegrationOpsHints } from "./socialHubIntegrationOpsHints";
import {
  SocialHubAuditActionCode,
  SocialHubAuditService,
} from "./SocialHubAuditService";
import { mapWebhookBridgedByPlatform } from "./socialHubWebhookBridgeSnapshot";

@Controller("company/social-hub")
export class SocialHubModuleStatusController {
  public constructor(private readonly auditService: SocialHubAuditService) {}

  @Get("status")
  public async getStatus(): Promise<{
    module: string;
    phase: string;
    subscriptionModuleCode: string;
    features: string[];
    integrationWebhookReadiness: ReturnType<
      typeof buildSocialHubIntegrationWebhookReadiness
    >;
    integrationWebhooks: ReturnType<typeof buildSocialHubPublicWebhookUrls>;
    integrationOpsHints: ReturnType<typeof buildSocialHubIntegrationOpsHints>;
    webhookBridge24h: {
      total: number;
      companiesActive24h: number;
      byPlatform: ReturnType<typeof mapWebhookBridgedByPlatform>;
    };
    webhookBridge7d: {
      total: number;
      companiesActive7d: number;
      byPlatform: ReturnType<typeof mapWebhookBridgedByPlatform>;
    };
  }> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      total24h,
      bridgedByPlatform24h,
      companiesActive24h,
      total7d,
      bridgedByPlatform7d,
      companiesActive7d,
    ] = await Promise.all([
      this.auditService.countRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since24h,
      ),
      this.auditService.summarizeWebhookBridgedByPlatform(since24h),
      this.auditService.countDistinctCompaniesRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since24h,
      ),
      this.auditService.countRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since7d,
      ),
      this.auditService.summarizeWebhookBridgedByPlatform(since7d),
      this.auditService.countDistinctCompaniesRecentByAction(
        SocialHubAuditActionCode.WebhookInboundBridged,
        since7d,
      ),
    ]);
    return {
      module: "social_hub",
      phase: "au",
      subscriptionModuleCode: SubscriptionModuleCode.SocialHub,
      features: [
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
        "tiktok_roadmap_provider",
        "channel_outbound_30d_stats",
        "manual_notify_cooldown",
        "slack_digest_7d_channel_rates",
        "youtube_roadmap_provider",
        "roadmap_channel_interest",
        "weekly_email_30d_summary",
        "slack_digest_30d_channel_rates",
        "roadmap_interest_digest_summaries",
        "roadmap_oauth_env_readiness",
        "platform_admin_roadmap_interest_stats",
        "linkedin_inbox_roadmap_message",
        "tiktok_oauth_beta_skeleton",
        "roadmap_oauth_connect_flow",
        "youtube_oauth_beta_skeleton",
        "roadmap_token_refresh",
        "roadmap_token_refresh_job",
        "health_roadmap_beta_channels",
        "tiktok_webhook_skeleton",
        "tiktok_webhook_messaging_bridge",
        "integration_webhook_urls_snapshot",
        "tiktok_outbound_beta_skeleton",
        "tiktok_webhook_signature_verify",
        "youtube_webhook_skeleton",
        "youtube_webhook_messaging_bridge",
        "youtube_pubsub_push_decode",
        "youtube_outbound_beta_skeleton",
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
        "company_audit_log_csv_export",
        "public_status_webhook_bridge_7d",
        "admin_webhook_bridged_7d_metrics",
        "analytics_meta_platform_insights",
        "analytics_linkedin_org_insights",
        "inbox_threads_preview_panel",
        "inbox_sync_summary_by_platform",
        "publishing_media_upload_graph",
        "publishing_calendar_grid",
        "templates_variables_render_preview",
        "messaging_quick_reply_template_render",
      ],
      integrationWebhookReadiness: buildSocialHubIntegrationWebhookReadiness(),
      integrationWebhooks: buildSocialHubPublicWebhookUrls(),
      integrationOpsHints: buildSocialHubIntegrationOpsHints(),
      webhookBridge24h: {
        total: total24h,
        companiesActive24h,
        byPlatform: mapWebhookBridgedByPlatform(bridgedByPlatform24h),
      },
      webhookBridge7d: {
        total: total7d,
        companiesActive7d,
        byPlatform: mapWebhookBridgedByPlatform(bridgedByPlatform7d),
      },
    };
  }
}
