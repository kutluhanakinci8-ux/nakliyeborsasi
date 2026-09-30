import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import { SocialPlatformCode } from "@nakliyeborsasi/core";

@Injectable()
export class SocialHubWebhookIngestService {
  private readonly logger = new Logger(SocialHubWebhookIngestService.name);

  public constructor(private readonly oauthConfig: SocialHubOAuthConfigService) {}

  public async ingestMetaPayload(
    signatureHeader: string | undefined,
    body: Record<string, unknown>,
    rawBody: Buffer | undefined,
  ): Promise<void> {
    this.verifyMetaSignature(signatureHeader, rawBody);
    const entries = (body.entry as unknown[]) ?? [];
    this.logger.log(`Meta webhook entries=${entries.length}`);
    await this.tryIngestMessagingSample(body, SocialPlatformCode.Instagram);
  }

  public async ingestWhatsAppPayload(
    signatureHeader: string | undefined,
    body: Record<string, unknown>,
    rawBody: Buffer | undefined,
  ): Promise<void> {
    this.verifyMetaSignature(signatureHeader, rawBody);
    const entries = (body.entry as unknown[]) ?? [];
    this.logger.log(`WhatsApp webhook entries=${entries.length}`);
    await this.tryIngestMessagingSample(body, SocialPlatformCode.WhatsAppCloud);
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

  /** MVP: gerçek tenant eşlemesi Faz E+ ile; şimdilik yalnızca log + şema doğrulama. */
  private async tryIngestMessagingSample(
    _body: Record<string, unknown>,
    platform: SocialPlatformCode,
  ): Promise<void> {
    this.logger.debug(`Webhook ingest placeholder platform=${platform}`);
  }
}
