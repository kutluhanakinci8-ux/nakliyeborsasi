import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingWhatsappBridgeService } from "./MessagingWhatsappBridgeService";
import { MessagingOptionalWsService } from "./MessagingOptionalWsService";
import { EmailOutboxService } from "../notification/EmailOutboxService";
import { EmailDeliveryHealthService } from "../notification/EmailDeliveryHealthService";
import { buildMessagingAttachmentOpsSnapshot } from "./messagingAttachmentOpsSnapshot";
import { MessagingAttachmentS3ProbeService } from "./MessagingAttachmentS3ProbeService";
import { summarizeMessagingWebRtcIceCaps } from "./messagingWebRtcIceConfig";
import {
  meetRecordingMaxBytes,
  meetRecordingS3Enabled,
} from "./messagingWebRtcMeetRecordingS3";
import { summarizeMessagingWebRtcMeetCapacity } from "./messagingWebRtcMeetCapacity";
import { MessagingWebRtcMeetOverflowIntentService } from "./MessagingWebRtcMeetOverflowIntentService";
import { probeMessagingWebRtcSfuBackend } from "./messagingWebRtcSfuBackend";
import { MessagingWebRtcNativeBridgeService } from "./MessagingWebRtcNativeBridgeService";

@Controller("platform-admin/communications-ops")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformCommunicationsOpsController {
  public constructor(
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly messagingWhatsappBridgeService: MessagingWhatsappBridgeService,
    private readonly messagingOptionalWsService: MessagingOptionalWsService,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly emailDeliveryHealthService: EmailDeliveryHealthService,
    private readonly messagingAttachmentS3ProbeService: MessagingAttachmentS3ProbeService,
    private readonly meetOverflowIntentService: MessagingWebRtcMeetOverflowIntentService,
    private readonly nativeBridgeService: MessagingWebRtcNativeBridgeService,
  ) {}

  @Get("snapshot")
  public async snapshot(): Promise<{
    recordedAt: string;
    slo: {
      messagingSseTicketP95MsMax: number;
      messagingVisibilityTargetMs: number;
      hintTr: string;
    };
    messaging: {
      sse: ReturnType<MessagingRealtimeHubService["getStats"]>;
      whatsappBridge: ReturnType<
        MessagingWhatsappBridgeService["getDeliverySnapshot"]
      >;
      ws: { enabled: boolean; port: number | null };
    };
    mail: {
      outbox: Awaited<ReturnType<EmailOutboxService["getOutboxStats"]>>;
      delivery: {
        deliveryMode: string;
        lastVerifyOk: boolean | null;
        lastVerifyError: string | null;
        outboxOperations: ReturnType<
          EmailDeliveryHealthService["getSnapshot"]
        >["outboxOperations"];
      };
    };
    messagingAttachments: {
      ops: ReturnType<typeof buildMessagingAttachmentOpsSnapshot>;
      s3Probe: Awaited<
        ReturnType<MessagingAttachmentS3ProbeService["probe"]>
      >;
    };
    webrtcMeet: {
      capacity: ReturnType<typeof summarizeMessagingWebRtcMeetCapacity>;
      sfuOverflowIntentTotal: number;
      sfuBackend: Awaited<ReturnType<typeof probeMessagingWebRtcSfuBackend>>;
      nativeRtcBridgeHandshakes: number;
      nativeRnWebRtcLinkedReports: number;
      iceCaps: ReturnType<typeof summarizeMessagingWebRtcIceCaps>;
      recordingArchive: { s3Enabled: boolean; maxBytes: number };
    };
  }> {
    const mailHealth = this.emailDeliveryHealthService.getSnapshot();
    const p95Max = Number.parseInt(
      process.env.MESSAGING_SSE_P95_MS_MAX ?? "8000",
      10,
    );
    return {
      recordedAt: new Date().toISOString(),
      slo: {
        messagingSseTicketP95MsMax: Number.isFinite(p95Max) ? p95Max : 8000,
        messagingVisibilityTargetMs: 2000,
        hintTr:
          "Aynı thread’de mesaj görünürlük hedefi ~2 sn (SSE/poll). SSE ticket+bağlantı p95 smoke: scripts/smoke-messaging-sse-load.sh",
      },
      messaging: {
        sse: this.messagingRealtimeHubService.getStats(),
        whatsappBridge: this.messagingWhatsappBridgeService.getDeliverySnapshot(),
        ws: {
          enabled: this.messagingOptionalWsService.isEnabled(),
          port: this.messagingOptionalWsService.getPort(),
        },
      },
      mail: {
        outbox: await this.emailOutboxService.getOutboxStats(),
        delivery: {
          deliveryMode: mailHealth.deliveryMode,
          lastVerifyOk: mailHealth.lastVerifyOk,
          lastVerifyError: mailHealth.lastVerifyError,
          outboxOperations: mailHealth.outboxOperations,
        },
      },
      messagingAttachments: {
        ops: buildMessagingAttachmentOpsSnapshot(),
        s3Probe: await this.messagingAttachmentS3ProbeService.probe(),
      },
      webrtcMeet: {
        capacity: summarizeMessagingWebRtcMeetCapacity(),
        sfuOverflowIntentTotal:
          await this.meetOverflowIntentService.countGlobalIntents(),
        sfuBackend: await probeMessagingWebRtcSfuBackend(),
        nativeRtcBridgeHandshakes:
          await this.nativeBridgeService.countHandshakes(),
        nativeRnWebRtcLinkedReports:
          await this.nativeBridgeService.countLinkedDevClientReports(),
        iceCaps: summarizeMessagingWebRtcIceCaps(),
        recordingArchive: {
          s3Enabled: meetRecordingS3Enabled(),
          maxBytes: meetRecordingMaxBytes(),
        },
      },
    };
  }
}
