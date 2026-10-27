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
import { summarizeMessagingWebRtcMeetCapacity } from "./messagingWebRtcMeetCapacity";
import { probeMessagingWebRtcSfuBackend } from "./messagingWebRtcSfuBackend";
import { summarizeMessagingWebRtcNativeBridge } from "./messagingWebRtcNativeBridge";
import { summarizeMessagingWebRtcMeetProgramClosure } from "./messagingWebRtcMeetProgramClosure";
import {
  messagingVoiceNoteDeeplinkFaz4Enabled,
  messagingVoiceNoteFaz1Enabled,
  messagingVoiceNoteMaxDurationMs,
  messagingVoiceNoteMobileFaz3Enabled,
  messagingVoiceNotePlayerFaz2Enabled,
} from "./messagingVoiceNoteConfig";
import {
  messagingVoiceSttConfigured,
  messagingVoiceSttDefaultLanguage,
  messagingVoiceSttLocalFaz1Enabled,
  messagingVoiceSttMaxConcurrent,
  messagingVoiceSttReliabilityFaz1Enabled,
  messagingVoiceSttTrQualityFaz1Enabled,
  messagingVoiceTranscribeAdvancedFaz2Enabled,
  messagingVoiceTranscribeAutoFaz3Enabled,
  messagingVoiceTranscribeFaz1Enabled,
  resolveMessagingVoiceSttProvider,
} from "./messagingVoiceTranscribeConfig";
import {
  messagingVoiceBridgeSttFaz1Enabled,
  messagingVoiceBridgeWaInboundFaz2Enabled,
} from "./messagingVoiceBridgeSttConfig";
import { messagingVoiceSttGlossaryRuleCount } from "./messagingVoiceSttGlossary";
import { messagingVoiceSttActiveCount } from "./messagingVoiceSttConcurrency";
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
      capacityPath: string;
      maxParticipants: number;
      meshMode: "p2p";
      capacity: ReturnType<typeof summarizeMessagingWebRtcMeetCapacity>;
      sfuStatusPath: string;
      sfuBackend: Awaited<ReturnType<typeof probeMessagingWebRtcSfuBackend>>;
      sfuEmbed: {
        enabled: boolean;
        deepLinkParam: string;
        localMediaPreview: boolean;
      };
      nativeRtcBridge: ReturnType<typeof summarizeMessagingWebRtcNativeBridge>;
      meetProgram: ReturnType<typeof summarizeMessagingWebRtcMeetProgramClosure>;
      iceCaps: ReturnType<typeof summarizeMessagingWebRtcIceCaps>;
      turnMonitor: Awaited<ReturnType<typeof probeMessagingWebRtcTurnMonitor>>;
      recordingArchive: { s3Enabled: boolean; maxBytes: number };
    };
    mobileExpoPush: { registerPath: string; enabled: boolean };
    voiceNote: {
      faz1Enabled: boolean;
      playerFaz2Enabled: boolean;
      mobileFaz3Enabled: boolean;
      deeplinkFaz4Enabled: boolean;
      maxDurationMs: number;
      transcribeFaz1Enabled: boolean;
      transcribeAdvancedFaz2Enabled: boolean;
      transcribeAutoFaz3Enabled: boolean;
      bridgeSttFaz1Enabled: boolean;
      bridgeWaInboundFaz2Enabled: boolean;
      sttConfigured: boolean;
      sttProvider: "local" | "openai" | "unconfigured";
      sttDefaultLanguage: string | null;
      sttGlossaryRuleCount: number;
      sttTrQualityFaz1Enabled: boolean;
      sttMaxConcurrent: number;
      sttActiveJobs: number;
      sttReliabilityFaz1Enabled: boolean;
    };
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
    const sfuBackend = await probeMessagingWebRtcSfuBackend();
    const voiceNoteFaz1 = messagingVoiceNoteFaz1Enabled();
    const voiceNotePlayerFaz2 = messagingVoiceNotePlayerFaz2Enabled();
    const voiceNoteMobileFaz3 = messagingVoiceNoteMobileFaz3Enabled();
    const voiceNoteDeeplinkFaz4 = messagingVoiceNoteDeeplinkFaz4Enabled();
    const messagingFeatures: string[] = [
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
        "messaging_webrtc_meet_native_shell_faz13",
        "messaging_webrtc_meet_ediscovery_faz14",
        "messaging_webrtc_meet_capacity_faz15",
        "messaging_webrtc_meet_sfu_intent_faz16",
        "messaging_webrtc_meet_sfu_config_faz17",
        "messaging_webrtc_meet_sfu_session_faz18",
        "messaging_webrtc_meet_sfu_embed_faz19",
        "messaging_webrtc_meet_native_rtc_faz20",
        "messaging_webrtc_meet_native_module_faz21",
        "messaging_webrtc_meet_rn_webrtc_pilot_faz22",
        "messaging_webrtc_meet_rn_mesh_media_faz23",
        "messaging_webrtc_meet_rn_rtc_view_faz24",
        "messaging_webrtc_meet_program_closure_faz25",
    ];
    if (voiceNoteFaz1) {
      messagingFeatures.push("messaging_voice_note_faz1");
    }
    if (voiceNotePlayerFaz2) {
      messagingFeatures.push("messaging_voice_note_player_faz2");
    }
    if (voiceNoteMobileFaz3) {
      messagingFeatures.push("messaging_voice_note_mobile_faz3");
    }
    if (voiceNoteDeeplinkFaz4) {
      messagingFeatures.push("messaging_voice_note_deeplink_faz4");
    }
    const voiceTranscribeFaz1 = messagingVoiceTranscribeFaz1Enabled();
    const voiceTranscribeFaz2 = messagingVoiceTranscribeAdvancedFaz2Enabled();
    const voiceTranscribeFaz3 = messagingVoiceTranscribeAutoFaz3Enabled();
    const voiceBridgeSttFaz1 = messagingVoiceBridgeSttFaz1Enabled();
    const voiceBridgeWaInboundFaz2 = messagingVoiceBridgeWaInboundFaz2Enabled();
    const voiceSttLocalFaz1 = messagingVoiceSttLocalFaz1Enabled();
    const voiceSttTrQualityFaz1 = messagingVoiceSttTrQualityFaz1Enabled();
    const voiceSttReliabilityFaz1 = messagingVoiceSttReliabilityFaz1Enabled();
    if (voiceTranscribeFaz1) {
      messagingFeatures.push("messaging_voice_transcribe_manual_faz1");
    }
    if (voiceTranscribeFaz2) {
      messagingFeatures.push("messaging_voice_transcribe_advanced_faz2");
    }
    if (voiceTranscribeFaz3) {
      messagingFeatures.push("messaging_voice_transcribe_auto_faz3");
    }
    if (voiceBridgeSttFaz1) {
      messagingFeatures.push("messaging_voice_bridge_stt_faz1");
    }
    if (voiceBridgeWaInboundFaz2) {
      messagingFeatures.push("messaging_voice_bridge_wa_inbound_faz2");
    }
    if (voiceSttLocalFaz1) {
      messagingFeatures.push("messaging_voice_stt_local_faz1");
    }
    if (voiceSttTrQualityFaz1) {
      messagingFeatures.push("messaging_voice_stt_tr_quality_faz1");
    }
    if (voiceSttReliabilityFaz1) {
      messagingFeatures.push("messaging_voice_stt_reliability_faz1");
    }
    return {
      module: "messaging",
      phase: "ga",
      features: messagingFeatures,
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
        capacityPath: "/messaging/webrtc/capacity",
        maxParticipants: MESSAGING_WEBRTC_MAX_PARTICIPANTS,
        meshMode: "p2p",
        capacity: summarizeMessagingWebRtcMeetCapacity(),
        sfuStatusPath: "/messaging/webrtc/sfu/status",
        sfuBackend,
        sfuEmbed: {
          enabled: true,
          deepLinkParam: "sfuPilot",
          localMediaPreview: true,
        },
        nativeRtcBridge: summarizeMessagingWebRtcNativeBridge(),
        meetProgram: summarizeMessagingWebRtcMeetProgramClosure(),
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
      voiceNote: {
        faz1Enabled: voiceNoteFaz1,
        playerFaz2Enabled: voiceNotePlayerFaz2,
        mobileFaz3Enabled: voiceNoteMobileFaz3,
        deeplinkFaz4Enabled: voiceNoteDeeplinkFaz4,
        maxDurationMs: messagingVoiceNoteMaxDurationMs(),
        transcribeFaz1Enabled: voiceTranscribeFaz1,
        transcribeAdvancedFaz2Enabled: voiceTranscribeFaz2,
        transcribeAutoFaz3Enabled: voiceTranscribeFaz3,
        bridgeSttFaz1Enabled: voiceBridgeSttFaz1,
        bridgeWaInboundFaz2Enabled: voiceBridgeWaInboundFaz2,
        sttConfigured: messagingVoiceSttConfigured(),
        sttProvider: resolveMessagingVoiceSttProvider(),
        sttDefaultLanguage: messagingVoiceSttDefaultLanguage(),
        sttGlossaryRuleCount: messagingVoiceSttGlossaryRuleCount(),
        sttTrQualityFaz1Enabled: voiceSttTrQualityFaz1,
        sttMaxConcurrent: messagingVoiceSttMaxConcurrent(),
        sttActiveJobs: messagingVoiceSttActiveCount(),
        sttReliabilityFaz1Enabled: voiceSttReliabilityFaz1,
      },
    };
  }
}
