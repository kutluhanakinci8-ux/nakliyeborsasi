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
      phase: "e",
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
      ],
    };
  }
}
