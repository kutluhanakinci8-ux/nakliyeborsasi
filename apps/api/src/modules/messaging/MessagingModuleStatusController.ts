import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { resolveMessagingVapidFromEnv } from "../../infrastructure/push/messagingVapidEnv";
import { MessagingAttachmentStorageService } from "./MessagingAttachmentStorageService";
import { buildMessagingAttachmentOpsSnapshot } from "./messagingAttachmentOpsSnapshot";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingOptionalWsService } from "./MessagingOptionalWsService";
import { MessagingWhatsappBridgeService } from "./MessagingWhatsappBridgeService";
import { MESSAGING_WEBRTC_MAX_PARTICIPANTS } from "./messagingWebRtcConstants";
import { summarizeMessagingWebRtcIceCaps } from "./messagingWebRtcIceConfig";
import {
  enrichTurnMonitorWithIceCaps,
  probeMessagingWebRtcTurnMonitor,
} from "./messagingWebRtcTurnMonitor";
import {
  meetRecordingMaxBytes,
  meetRecordingS3Enabled,
} from "./messagingWebRtcMeetRecordingS3";
import { MessagingWebRtcSignalingService } from "./MessagingWebRtcSignalingService";
import type { WhatsappBridgeDeliverySnapshot } from "@nakliyeborsasi/core";

@Controller("messaging")
export class MessagingModuleStatusController {
  public constructor(
    private readonly configService: ConfigService,
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly messagingOptionalWsService: MessagingOptionalWsService,
    private readonly messagingWhatsappBridgeService: MessagingWhatsappBridgeService,
    private readonly messagingWebRtcSignalingService: MessagingWebRtcSignalingService,
  ) {}

  @Get("status")
  public async getStatus(): Promise<{
    module: string;
    phase: string;
    features: string[];
    translate: { deepl: boolean; libretranslate: boolean };
    attachments: {
      maxCount: number;
      maxBytesPerFile: number;
      localMaxBytesPerFile: number;
      s3MaxBytesPerFile: number;
      s3BucketConfigured: boolean;
      allowedContentTypes: string[];
      ops: ReturnType<typeof buildMessagingAttachmentOpsSnapshot>;
    };
    webPush: { enabled: boolean; isolatedVapid: boolean };
    sse: ReturnType<MessagingRealtimeHubService["getStats"]>;
    ws: { enabled: boolean; port: number | null };
    whatsappBridge: WhatsappBridgeDeliverySnapshot;
    webrtc: {
      clientStack: "browser";
      signaling: "redis_relay" | "unavailable" | "planned";
      codecsShippedWithApp: false;
      configPath: string;
      maxParticipants: number;
      meshMode: "p2p";
      iceCaps: ReturnType<typeof summarizeMessagingWebRtcIceCaps>;
      turnMonitor: Awaited<ReturnType<typeof probeMessagingWebRtcTurnMonitor>>;
      recordingArchive: { s3Enabled: boolean; maxBytes: number };
    };
    mobileExpoPush: { registerPath: string; enabled: boolean };
  }> {
    const deepl = Boolean(
      this.configService.get<string>("MESSAGING_DEEPL_API_KEY")?.trim(),
    );
    const libre = Boolean(
      this.configService.get<string>("MESSAGING_TRANSLATE_API_URL")?.trim(),
    );
    const vapid = resolveMessagingVapidFromEnv();
    const webrtcRelay = await this.messagingWebRtcSignalingService.isRelayAvailable();
    const iceCaps = summarizeMessagingWebRtcIceCaps();
    const turnMonitor = enrichTurnMonitorWithIceCaps(
      await probeMessagingWebRtcTurnMonitor(),
      iceCaps.turnCredentialsConfigured,
    );
    return {
      module: "messaging",
      phase: "ga",
      features: [
        "company_threads",
        "freight_listing_threads",
        "email_notifications",
        "deep_links",
        "read_receipts",
        "structured_summary",
        "translate_api",
        "company_export",
        "platform_ediscovery",
        "sse_stream",
        "attachments",
        "web_push",
        "server_search",
        "markdown_messages",
        "quick_replies",
        "thread_insights",
        "thread_llm_summary",
        "user_read_receipts",
        "typing_indicator",
        "internal_notes",
        "message_edit_delete",
        "user_mentions",
        "sse_redis_fanout",
        "thread_legal_hold",
        "messaging_crud_audit",
        "ediscovery_zip_sha256",
        "company_message_rate_limit",
        "outbound_webhooks",
        "public_api_messaging_read",
        "retention_policy_job",
        "chat_accept_fixed_price",
        "notify_push_messaging_chat",
        "slack_incoming_bridge",
        "automation_catalog_zapier_make",
        "messaging_bot_tokens",
        "public_api_messaging_write",
        "optional_ws_gateway",
        "group_threads_pilot",
        "whatsapp_notify_bridge",
        "company_search",
        "hub_default_tab",
        "read_receipt_panel",
        "group_thread_ui",
        "message_edit_modal",
        "mention_highlight",
        "internal_note_filter",
        "attachment_drag_drop",
        "message_day_avatars",
        "search_scroll_to_message",
        "context_pin_strip",
        "mobile_thread_layout",
        "quote_reply",
        "message_operation_stamp",
        "quick_reply_org_crud",
        "compose_keyboard_shortcuts",
        "notification_matrix_messaging",
        "ediscovery_zip_prod_ready",
        "whatsapp_notify_bridge_kvkk",
        "webhook_message_stamped",
        "group_participant_roles",
        "partner_api_messaging_stamp",
        "native_shell_capacitor_ready",
        "native_shell_capacitor_docs",
        "browser_webrtc_disclosure",
        "mobile_expo_push_api",
        "messaging_webrtc_signaling_relay",
        "messaging_webrtc_mesh_three",
        "messaging_webrtc_meet_core_faz1",
        "messaging_webrtc_meet_hd_faz2",
        "messaging_webrtc_meet_biz_faz3",
        "messaging_webrtc_meet_ops_faz4",
        "messaging_webrtc_meet_reliability_faz5",
        "messaging_webrtc_meet_prod_net_faz6",
        "messaging_webrtc_meet_compliance_faz7",
        "messaging_webrtc_meet_qa_gate_faz8",
        "messaging_webrtc_meet_realtime_faz9",
        "messaging_webrtc_meet_mobile_faz10",
        "messaging_webrtc_meet_enterprise_faz11",
        "messaging_webrtc_meet_turn_prod_faz12",
      ],
      translate: { deepl, libretranslate: libre },
      attachments: (() => {
        const ops = buildMessagingAttachmentOpsSnapshot();
        return {
          maxCount: MessagingAttachmentStorageService.maxAttachmentsPublic(),
          maxBytesPerFile: MessagingAttachmentStorageService.maxBytesPublic(),
          localMaxBytesPerFile: ops.localMaxBytesPerFile,
          s3MaxBytesPerFile: ops.s3MaxBytesPerFile,
          s3BucketConfigured: ops.s3BucketConfigured,
          allowedContentTypes:
            MessagingAttachmentStorageService.allowedContentTypesPublic(),
          ops,
        };
      })(),
      webPush: {
        enabled: vapid !== null,
        isolatedVapid: vapid?.isolated ?? false,
      },
      sse: this.messagingRealtimeHubService.getStats(),
      ws: {
        enabled: this.messagingOptionalWsService.isEnabled(),
        port: this.messagingOptionalWsService.getPort(),
      },
      whatsappBridge: this.messagingWhatsappBridgeService.getDeliverySnapshot(),
      webrtc: {
        clientStack: "browser",
        signaling: webrtcRelay ? "redis_relay" : "unavailable",
        codecsShippedWithApp: false,
        configPath: "/messaging/webrtc/config",
        maxParticipants: MESSAGING_WEBRTC_MAX_PARTICIPANTS,
        meshMode: "p2p",
        iceCaps,
        turnMonitor,
        recordingArchive: {
          s3Enabled: meetRecordingS3Enabled(),
          maxBytes: meetRecordingMaxBytes(),
        },
      },
      mobileExpoPush: {
        registerPath: "/messaging/push/expo/register",
        enabled: true,
      },
    };
  }
}
