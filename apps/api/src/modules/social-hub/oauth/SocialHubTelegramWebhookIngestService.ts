import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { timingSafeEqual } from "node:crypto";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";
import { SocialHubWebhookBridgeAuditService } from "../SocialHubWebhookBridgeAuditService";
import { parseSocialHubConnectionMetadata } from "./SocialHubConnectionMetadata";
import { parseTelegramInboundMessage } from "./socialHubTelegramWebhookParser";

@Injectable()
export class SocialHubTelegramWebhookIngestService {
  private readonly logger = new Logger(SocialHubTelegramWebhookIngestService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
    private readonly webhookBridgeAuditService: SocialHubWebhookBridgeAuditService,
  ) {}

  public async ingestPayload(params: {
    connectionId: string;
    secretTokenHeader: string | undefined;
    body: Record<string, unknown>;
  }): Promise<void> {
    const connection = await this.connectionRepository.findOne({
      where: { id: params.connectionId.trim() },
    });
    if (
      !connection ||
      connection.platformCode !== SocialPlatformCode.Telegram ||
      connection.statusCode !== SocialConnectionStatusCode.Connected
    ) {
      this.logger.warn(
        `Telegram webhook: unknown or inactive connection id=${params.connectionId}`,
      );
      return;
    }
    const metadata = parseSocialHubConnectionMetadata(connection.grantedScopes);
    const expectedSecret = metadata.telegramWebhookSecret?.trim() ?? "";
    if (expectedSecret) {
      const provided = params.secretTokenHeader?.trim() ?? "";
      if (!this.secretsMatch(expectedSecret, provided)) {
        this.logger.warn(
          `Telegram webhook: secret mismatch connection=${connection.id}`,
        );
        return;
      }
    }

    const parsed = parseTelegramInboundMessage(params.body);
    if (!parsed) {
      return;
    }

    const result = await this.messagingBridgeService.ingestWebhookInbound({
      companyId: connection.companyId,
      platformCode: SocialPlatformCode.Telegram,
      externalThreadId: parsed.externalThreadId,
      displayLabel: parsed.displayLabel,
      bodyText: parsed.bodyText,
      externalMessageId: parsed.externalMessageId,
    });
    if (result.ingested) {
      this.logger.log(
        `Telegram message bridged company=${connection.companyId} thread=${result.threadId}`,
      );
      this.webhookBridgeAuditService.recordInboundBridged({
        companyId: connection.companyId,
        platformCode: SocialPlatformCode.Telegram,
        threadId: result.threadId,
        externalThreadId: parsed.externalThreadId,
        externalMessageId: parsed.externalMessageId,
      });
    }
  }

  private secretsMatch(expected: string, provided: string): boolean {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(provided, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
