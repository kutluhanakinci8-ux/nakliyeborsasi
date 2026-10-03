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
    if (object === "instagram" && messages.length === 0) {
      this.logInstagramWebhookShape(body);
    }
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

  private logInstagramWebhookShape(body: Record<string, unknown>): void {
    const entries = Array.isArray(body.entry) ? body.entry : [];
    const shapes: string[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      const entryId = typeof record.id === "string" ? record.id : "?";
      const messagingLen = Array.isArray(record.messaging)
        ? record.messaging.length
        : 0;
      const standbyLen = Array.isArray(record.standby)
        ? record.standby.length
        : 0;
      const entryField =
        typeof record.field === "string" ? record.field : "";
      const changeFields = Array.isArray(record.changes)
        ? record.changes
            .map((c) =>
              c && typeof c === "object" && typeof (c as { field?: string }).field === "string"
                ? (c as { field: string }).field
                : "?",
            )
            .join(",")
        : "";
      const eventKinds: string[] = [];
      const messaging = Array.isArray(record.messaging) ? record.messaging : [];
      for (const item of messaging) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const ev = item as Record<string, unknown>;
        if (ev.message) {
          eventKinds.push("message");
        } else if (ev.reaction) {
          eventKinds.push("reaction");
        } else if (ev.postback) {
          eventKinds.push("postback");
        } else if (ev.read) {
          eventKinds.push("read");
        } else if (ev.delivery) {
          eventKinds.push("delivery");
        } else {
          eventKinds.push("other");
        }
      }
      shapes.push(
        `entry=${entryId} messaging=${messagingLen} standby=${standbyLen} field=${entryField || "-"} changes=[${changeFields}] kinds=[${eventKinds.join(",")}]`,
      );
    }
    if (shapes.length > 0) {
      this.logger.log(`Instagram webhook shape: ${shapes.join(" | ")}`);
    }
  }

  private verifyMetaSignature(
    signatureHeader: string | undefined,
    rawBody: Buffer | undefined,
  ): void {
    if (!rawBody || !signatureHeader?.startsWith("sha256=")) {
      return;
    }
    const secrets = [
      this.oauthConfig.getMetaConfig()?.appSecret,
      this.oauthConfig.getInstagramLoginConfig()?.appSecret,
    ].filter((value): value is string => Boolean(value?.trim()));
    if (secrets.length === 0) {
      return;
    }
    const provided = signatureHeader.slice("sha256=".length);
    let matched = false;
    for (const secret of secrets) {
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      try {
        const a = Buffer.from(expected, "hex");
        const b = Buffer.from(provided, "hex");
        if (a.length === b.length && timingSafeEqual(a, b)) {
          matched = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (!matched) {
      this.logger.warn("Meta webhook signature mismatch");
    }
  }
}
