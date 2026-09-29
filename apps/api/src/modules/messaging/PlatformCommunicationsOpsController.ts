import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { MessagingRealtimeHubService } from "./MessagingRealtimeHubService";
import { MessagingWhatsappBridgeService } from "./MessagingWhatsappBridgeService";
import { MessagingOptionalWsService } from "./MessagingOptionalWsService";
import { EmailOutboxService } from "../notification/EmailOutboxService";
import { EmailDeliveryHealthService } from "../notification/EmailDeliveryHealthService";

@Controller("platform-admin/communications-ops")
@UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
export class PlatformCommunicationsOpsController {
  public constructor(
    private readonly messagingRealtimeHubService: MessagingRealtimeHubService,
    private readonly messagingWhatsappBridgeService: MessagingWhatsappBridgeService,
    private readonly messagingOptionalWsService: MessagingOptionalWsService,
    private readonly emailOutboxService: EmailOutboxService,
    private readonly emailDeliveryHealthService: EmailDeliveryHealthService,
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
    };
  }
}
