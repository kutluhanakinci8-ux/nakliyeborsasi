import { Controller, Get } from "@nestjs/common";
import { SubscriptionModuleCode } from "@nakliyeborsasi/core";

@Controller("company/social-hub")
export class SocialHubModuleStatusController {
  @Get("status")
  public getStatus(): {
    module: string;
    phase: string;
    subscriptionModuleCode: string;
    features: string[];
  } {
    return {
      module: "social_hub",
      phase: "t",
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
      ],
    };
  }
}
