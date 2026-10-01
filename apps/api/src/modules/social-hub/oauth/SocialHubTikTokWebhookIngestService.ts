import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialConnectionStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";
import { parseTikTokWebhookInbound } from "./socialHubTikTokWebhookParser";
import { verifyTikTokWebhookSignature } from "./socialHubTikTokWebhookSignature";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";

const ROADMAP_TIKTOK = "TIKTOK";

@Injectable()
export class SocialHubTikTokWebhookIngestService {
  private readonly logger = new Logger(SocialHubTikTokWebhookIngestService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
    private readonly oauthConfig: SocialHubOAuthConfigService,
  ) {}

  public async ingestPayload(
    body: Record<string, unknown>,
    options?: {
      signatureHeader?: string;
      rawBody?: Buffer;
    },
  ): Promise<void> {
    const secret =
      process.env.SOCIAL_TIKTOK_WEBHOOK_SECRET?.trim() ??
      this.oauthConfig.getTikTokConfig()?.clientSecret;
    if (
      !verifyTikTokWebhookSignature({
        signatureHeader: options?.signatureHeader,
        rawBody: options?.rawBody,
        secret,
      })
    ) {
      this.logger.warn("TikTok webhook signature verification failed");
      return;
    }
    const event = typeof body.event === "string" ? body.event : "unknown";
    const clientKey =
      typeof body.client_key === "string" ? body.client_key : undefined;
    this.logger.log(
      `TikTok webhook received event=${event}${
        clientKey ? ` client_key=${clientKey.slice(0, 8)}…` : ""
      }`,
    );
    if (process.env.SOCIAL_TIKTOK_WEBHOOK_DEBUG === "1") {
      this.logger.debug(JSON.stringify(body).slice(0, 2000));
    }
    if (process.env.SOCIAL_TIKTOK_WEBHOOK_BRIDGE_ENABLED === "0") {
      return;
    }
    const parsed = parseTikTokWebhookInbound(body);
    if (!parsed) {
      this.logger.debug("TikTok webhook: no inbound message fields — skipped");
      return;
    }
    const connection = await this.connectionRepository.findOne({
      where: {
        platformCode: ROADMAP_TIKTOK,
        statusCode: SocialConnectionStatusCode.Connected,
        externalAccountId: parsed.businessOpenId,
      },
    });
    if (!connection) {
      this.logger.warn(
        `TikTok webhook: no connection for open_id=${parsed.businessOpenId}`,
      );
      return;
    }
    const result = await this.messagingBridgeService.ingestWebhookInbound({
      companyId: connection.companyId,
      platformCode: ROADMAP_TIKTOK,
      externalThreadId: parsed.externalThreadId,
      displayLabel: parsed.displayLabel,
      bodyText: parsed.bodyText,
      externalMessageId: parsed.externalMessageId,
    });
    if (result.ingested) {
      this.logger.log(
        `TikTok message bridged company=${connection.companyId} thread=${result.threadId}`,
      );
    }
  }
}
