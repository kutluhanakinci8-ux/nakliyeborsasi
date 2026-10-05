import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialConnectionStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import { SocialHubWebhookBridgeAuditService } from "../SocialHubWebhookBridgeAuditService";
import { parseXAccountActivityDmInbound } from "./socialHubXWebhookParser";
import { isXWebhookBridgeDeployEnabled } from "../socialHubXProdProvider";

const ROADMAP_X = "X";

@Injectable()
export class SocialHubXWebhookIngestService {
  private readonly logger = new Logger(SocialHubXWebhookIngestService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly webhookBridgeAuditService: SocialHubWebhookBridgeAuditService,
  ) {}

  public async ingestPayload(body: Record<string, unknown>): Promise<void> {
    if (!isXWebhookBridgeDeployEnabled()) {
      return;
    }
    if (process.env.SOCIAL_X_WEBHOOK_DEBUG === "1") {
      this.logger.debug(JSON.stringify(body).slice(0, 2500));
    }
    const parsed = parseXAccountActivityDmInbound(body);
    if (!parsed) {
      this.logger.debug("X webhook: no inbound DM fields — skipped");
      return;
    }
    const connection = await this.connectionRepository.findOne({
      where: {
        platformCode: ROADMAP_X,
        statusCode: SocialConnectionStatusCode.Connected,
        externalAccountId: parsed.forUserId,
      },
    });
    if (!connection) {
      this.logger.warn(
        `X webhook: no connection for_user_id=${parsed.forUserId}`,
      );
      return;
    }
    const result = await this.messagingBridgeService.ingestWebhookInbound({
      companyId: connection.companyId,
      platformCode: ROADMAP_X,
      externalThreadId: parsed.externalThreadId,
      displayLabel: parsed.displayLabel,
      bodyText: parsed.bodyText,
      externalMessageId: parsed.externalMessageId,
    });
    if (result.ingested) {
      this.logger.log(
        `X DM bridged company=${connection.companyId} thread=${result.threadId}`,
      );
      this.webhookBridgeAuditService.recordInboundBridged({
        companyId: connection.companyId,
        platformCode: ROADMAP_X,
        threadId: result.threadId,
        externalThreadId: parsed.externalThreadId,
        externalMessageId: parsed.externalMessageId,
      });
    }
  }

  public resolveWebhookConsumerSecret(): string | null {
    return (
      process.env.SOCIAL_X_WEBHOOK_CRC_SECRET?.trim() ??
      this.oauthConfig.getXConfig()?.clientSecret ??
      null
    );
  }
}
