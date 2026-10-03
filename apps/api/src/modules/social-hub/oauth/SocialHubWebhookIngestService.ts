import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import { parseMetaWebhookBody } from "./SocialHubMetaWebhookParser";
import { SocialHubWebhookRoutingService } from "./SocialHubWebhookRoutingService";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";
import { SocialHubWebhookBridgeAuditService } from "../SocialHubWebhookBridgeAuditService";
import { SocialPlatformCode } from "@nakliyeborsasi/core";

@Injectable()
export class SocialHubWebhookIngestService {
  private readonly logger = new Logger(SocialHubWebhookIngestService.name);

  public constructor(
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly routingService: SocialHubWebhookRoutingService,
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
    private readonly webhookBridgeAuditService: SocialHubWebhookBridgeAuditService,
  ) {}

  public async ingestMetaPayload(
    signatureHeader: string | undefined,
    body: Record<string, unknown>,
    rawBody: Buffer | undefined,
  ): Promise<void> {
    this.verifyMetaSignature(signatureHeader, rawBody);
    const { object, messages } = parseMetaWebhookBody(body);
    this.logger.log(`Meta webhook object=${object} messages=${messages.length}`);
    for (const message of messages) {
      const route = await this.routingService.resolveFromMetaPayload({
        object,
        entryId: message.entryId,
      });
      if (!route) {
        this.logger.warn(
          `Webhook route missing entry=${message.entryId} object=${object}`,
        );
        continue;
      }
      const platformCode =
        message.channel === "instagram" ||
        object === "instagram"
          ? SocialPlatformCode.Instagram
          : route.platformCode;
      const result = await this.messagingBridgeService.ingestWebhookInbound({
        companyId: route.companyId,
        platformCode,
        externalThreadId: message.externalThreadId,
        displayLabel: message.displayLabel,
        bodyText: message.bodyText,
        externalMessageId: message.externalMessageId,
      });
      if (result.ingested) {
        this.logger.log(
          `Ingested social message company=${route.companyId} thread=${result.threadId}`,
        );
        this.webhookBridgeAuditService.recordInboundBridged({
          companyId: route.companyId,
          platformCode,
          threadId: result.threadId,
          externalThreadId: message.externalThreadId,
          externalMessageId: message.externalMessageId,
        });
      }
    }
  }

  public async ingestWhatsAppPayload(
    signatureHeader: string | undefined,
    body: Record<string, unknown>,
    rawBody: Buffer | undefined,
  ): Promise<void> {
    await this.ingestMetaPayload(signatureHeader, body, rawBody);
  }

  private verifyMetaSignature(
    signatureHeader: string | undefined,
    rawBody: Buffer | undefined,
  ): void {
    const config = this.oauthConfig.getMetaConfig();
    if (!config?.appSecret || !rawBody || !signatureHeader?.startsWith("sha256=")) {
      return;
    }
    const expected = createHmac("sha256", config.appSecret)
      .update(rawBody)
      .digest("hex");
    const provided = signatureHeader.slice("sha256=".length);
    try {
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(provided, "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        this.logger.warn("Meta webhook signature mismatch");
      }
    } catch {
      this.logger.warn("Meta webhook signature parse failed");
    }
  }
}
