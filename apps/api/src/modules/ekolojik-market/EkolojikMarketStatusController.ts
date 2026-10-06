import { Controller, Get } from "@nestjs/common";
import { MessagingAttachmentStorageService } from "../messaging/MessagingAttachmentStorageService";

const EK_PHASE = "ek-m7";

const EK_SOCIAL_DM_PLATFORMS = [
  "INSTAGRAM",
  "WHATSAPP",
  "TELEGRAM",
  "MESSENGER",
  "X",
] as const;

const EK_FEATURES = [
  "ekolojik_product_shell",
  "ekolojik_communications_hub_unified",
  "ekolojik_mail_web_embed",
  "ekolojik_mail_folder_deep_link",
  "ekolojik_messaging_full_chat",
  "ekolojik_messaging_sse_redis_fanout",
  "ekolojik_messaging_interactions_parity",
  "ekolojik_messaging_attachments_audit_hold",
  "ekolojik_messaging_social_dm_bridge",
  "ekolojik_messaging_whatsapp_bridge_fs12",
  "ekolojik_messaging_public_api_slack_zapier",
  "ekolojik_social_hub_embed",
  "ekolojik_ci_workflow_ek_0",
] as const;

const EK_PHASE_MILESTONES = [
  "ek-0",
  "ek-u1",
  "ek-p1",
  "ek-p4",
  "ek-m1",
  "ek-m2",
  "ek-m3",
  "ek-m4",
  "ek-m5",
  "ek-m6",
  "ek-m7",
  "ek-s1",
  "ek-u4",
] as const;

@Controller("public/ekolojik-market")
export class EkolojikMarketStatusController {
  @Get("status")
  public getStatus(): {
    module: string;
    phase: string;
    features: string[];
    phaseMilestones: string[];
    parityRoadmapDoc: string;
    hubWebPath: string;
    messagingRealtime: {
      transport: string;
      nbModulePath: string;
    };
    messagingInteractions: string[];
    messagingAttachments: {
      maxCount: number;
      maxBytesPerFile: number;
      storageMode: string;
    };
    messagingCompliance: string[];
    messagingSocialDm: {
      hubSection: string;
      filter: string;
      platforms: string[];
      nbBridgeModule: string;
    };
    messagingWhatsappBridge: {
      phaseCode: string;
      hubDeepLinkQuery: string;
      configureApiPath: string;
      nbStatusFeatures: string[];
    };
    messagingIntegrations: {
      hubSection: string;
      hubPath: string;
      publicApiPath: string;
      automationCatalogPath: string;
      slackBridgePath: string;
      nbStatusFeatures: string[];
    };
  } {
    return {
      module: "ekolojik_market",
      phase: EK_PHASE,
      features: [...EK_FEATURES],
      phaseMilestones: [...EK_PHASE_MILESTONES],
      parityRoadmapDoc: "docs/EKOLojIK_MARKET_PARITY_ROADMAP.md",
      hubWebPath: "/marketim/posta-ve-mesaj",
      messagingRealtime: {
        transport: "sse_redis_fanout",
        nbModulePath: "/api/v1/messaging/status",
      },
      messagingInteractions: [
        "message_edit_delete",
        "user_mentions",
        "read_receipts",
        "typing_indicator",
        "quick_reply_templates",
        "group_thread_modal",
      ],
      messagingAttachments: {
        maxCount: MessagingAttachmentStorageService.maxAttachmentsPublic(),
        maxBytesPerFile: MessagingAttachmentStorageService.maxBytesPublic(),
        storageMode: "local_10mb",
      },
      messagingCompliance: [
        "messaging_crud_audit",
        "thread_legal_hold",
        "company_kvkk_export",
      ],
      messagingSocialDm: {
        hubSection: "sosyal-dm",
        filter: "social",
        platforms: [...EK_SOCIAL_DM_PLATFORMS],
        nbBridgeModule: "social_hub_messaging_bridge",
      },
      messagingWhatsappBridge: {
        phaseCode: "fs-12",
        hubDeepLinkQuery: "waBridge=1",
        configureApiPath: "/api/v1/messaging/integration/whatsapp-bridge",
        nbStatusFeatures: [
          "whatsapp_notify_bridge",
          "whatsapp_notify_bridge_kvkk",
        ],
      },
      messagingIntegrations: {
        hubSection: "entegrasyon",
        hubPath: "/marketim/posta-ve-mesaj?bolum=entegrasyon",
        publicApiPath: "/api/v1/public/lerta-messaging/v1",
        automationCatalogPath:
          "/api/v1/messaging/integration/automation-catalog",
        slackBridgePath: "/api/v1/messaging/integration/slack-bridge",
        nbStatusFeatures: [
          "public_api_messaging_read",
          "public_api_messaging_write",
          "outbound_webhooks",
          "slack_incoming_bridge",
          "automation_catalog_zapier_make",
        ],
      },
    };
  }
}
