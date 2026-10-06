import { Controller, Get } from "@nestjs/common";
import { MessagingAttachmentStorageService } from "../messaging/MessagingAttachmentStorageService";

const EK_PHASE = "ek-s6";

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
  "ekolojik_messaging_group_threads_roles",
  "ekolojik_messaging_push_translate_notify_matrix",
  "ekolojik_messaging_kvkk_export_retention",
  "ekolojik_messaging_premium_ui_rail",
  "ekolojik_social_hub_embed",
  "ekolojik_social_hub_connections_oauth",
  "ekolojik_social_hub_inbox_sync_summary",
  "ekolojik_social_hub_publishing_utm_media",
  "ekolojik_social_hub_templates",
  "ekolojik_social_hub_analytics",
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
  "ek-m8",
  "ek-m9",
  "ek-m10",
  "ek-m11",
  "ek-s1",
  "ek-s2",
  "ek-s3",
  "ek-s4",
  "ek-s5",
  "ek-s6",
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
    messagingGroupThreads: {
      hubSection: string;
      filter: string;
      openModalQuery: string;
      participantRoles: string[];
      nbStatusFeatures: string[];
    };
    messagingNotifications: {
      hubSection: string;
      hubPath: string;
      matrixApiPath: string;
      pushSubscribePath: string;
      nbStatusFeatures: string[];
    };
    messagingKvkkRetention: {
      hubSection: string;
      hubPath: string;
      exportApiPath: string;
      retentionApiPath: string;
      nbStatusFeatures: string[];
    };
    messagingPremiumUi: {
      phaseCode: string;
      hubChatSections: string[];
      chatBackgroundStorageKey: string;
      nbParityComponents: string[];
    };
    socialHubConnections: {
      hubSection: string;
      hubPath: string;
      oauthWebReturnQuery: string;
      connectApiBodyField: string;
      nbReturnPath: string;
    };
    socialHubInbox: {
      hubSection: string;
      hubTab: string;
      hubPath: string;
      threadsPreviewApiPath: string;
      syncSummaryApiPath: string;
      syncInboxApiPath: string;
      messagingDeepLinkHubSection: string;
    };
    socialHubPublishing: {
      hubSection: string;
      hubTab: string;
      hubPath: string;
      publishMediaApiPath: string;
      maxMediaAttachments: number;
      utmDeepLinkQueryParams: string[];
      nbTab: string;
    };
    socialHubTemplates: {
      hubSection: string;
      hubTab: string;
      hubPath: string;
      templateDeepLinkQueryParam: string;
      templatesApiPath: string;
      templatePreviewApiPath: string;
      templateRenderApiPath: string;
      messagingDeepLinkHubSection: string;
    };
    socialHubAnalytics: {
      hubSection: string;
      hubTab: string;
      hubPath: string;
      analyticsApiPath: string;
      analyticsExportApiPath: string;
      utmHighlightQueryParam: string;
      nbTab: string;
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
      messagingGroupThreads: {
        hubSection: "grup-sohbet",
        filter: "group",
        openModalQuery: "group=1",
        participantRoles: ["shipper", "carrier", "agent", "observer"],
        nbStatusFeatures: ["group_threads_pilot", "group_thread_ui"],
      },
      messagingNotifications: {
        hubSection: "bildirimler",
        hubPath: "/marketim/posta-ve-mesaj?bolum=bildirimler",
        matrixApiPath: "/api/v1/me/notification-preferences/matrix",
        pushSubscribePath: "/api/v1/messaging/push/subscribe",
        nbStatusFeatures: [
          "web_push",
          "translate_api",
          "notification_matrix_messaging",
          "notify_push_messaging_chat",
        ],
      },
      messagingKvkkRetention: {
        hubSection: "kvkk",
        hubPath: "/marketim/posta-ve-mesaj?bolum=kvkk",
        exportApiPath: "/api/v1/messaging/export",
        retentionApiPath: "/api/v1/messaging/integration/retention",
        nbStatusFeatures: [
          "company_export",
          "retention_policy_job",
          "thread_legal_hold",
          "ediscovery_zip_sha256",
        ],
      },
      messagingPremiumUi: {
        phaseCode: "ek-m11",
        hubChatSections: ["mesajlar", "sosyal-dm", "grup-sohbet"],
        chatBackgroundStorageKey: "lerta.messaging.chatBackground",
        nbParityComponents: [
          "MessagingSideRail",
          "ChatConversationBackgroundPicker",
          "messaging-page-layout",
        ],
      },
      socialHubConnections: {
        hubSection: "sosyal",
        hubPath: "/marketim/posta-ve-mesaj?bolum=sosyal&tab=connections",
        oauthWebReturnQuery: "bolum=sosyal&tab=connections",
        connectApiBodyField: "webReturnQuery",
        nbReturnPath: "/hesap/sosyal-medya?tab=connections",
      },
      socialHubInbox: {
        hubSection: "sosyal",
        hubTab: "inbox",
        hubPath: "/marketim/posta-ve-mesaj?bolum=sosyal&tab=inbox",
        threadsPreviewApiPath:
          "/api/v1/company/social-hub/inbox/threads-preview",
        syncSummaryApiPath: "/api/v1/company/social-hub/inbox/sync-summary",
        syncInboxApiPath:
          "/api/v1/company/social-hub/connections/{platformCode}/sync-inbox",
        messagingDeepLinkHubSection: "sosyal-dm",
      },
      socialHubPublishing: {
        hubSection: "sosyal",
        hubTab: "publishing",
        hubPath: "/marketim/posta-ve-mesaj?bolum=sosyal&tab=publishing",
        publishMediaApiPath: "/api/v1/company/social-hub/publishing/media",
        maxMediaAttachments: 4,
        utmDeepLinkQueryParams: [
          "utm_campaign",
          "utm_source",
          "utm_medium",
          "utm_content",
        ],
        nbTab: "publishing",
      },
      socialHubTemplates: {
        hubSection: "sosyal",
        hubTab: "templates",
        hubPath: "/marketim/posta-ve-mesaj?bolum=sosyal&tab=templates",
        templateDeepLinkQueryParam: "templateId",
        templatesApiPath: "/api/v1/company/social-hub/templates",
        templatePreviewApiPath: "/api/v1/company/social-hub/templates/preview",
        templateRenderApiPath:
          "/api/v1/company/social-hub/templates/{templateId}/render",
        messagingDeepLinkHubSection: "sosyal-dm",
      },
      socialHubAnalytics: {
        hubSection: "sosyal",
        hubTab: "analytics",
        hubPath: "/marketim/posta-ve-mesaj?bolum=sosyal&tab=analytics",
        analyticsApiPath: "/api/v1/company/social-hub/analytics",
        analyticsExportApiPath: "/api/v1/company/social-hub/analytics/export",
        utmHighlightQueryParam: "utm_campaign",
        nbTab: "analytics",
      },
    };
  }
}
