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
      phase: "n",
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
      ],
    };
  }
}
