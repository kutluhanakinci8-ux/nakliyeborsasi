import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialConnectionStatusCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";
import {
  expandYouTubePubSubWebhookBody,
  parseYouTubeWebhookInbound,
} from "./socialHubYouTubeWebhookParser";

const ROADMAP_YOUTUBE = "YOUTUBE";

@Injectable()
export class SocialHubYouTubeWebhookIngestService {
  private readonly logger = new Logger(SocialHubYouTubeWebhookIngestService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
  ) {}

  public async ingestPayload(body: Record<string, unknown>): Promise<void> {
    const expanded = expandYouTubePubSubWebhookBody(body);
    const kind =
      typeof expanded.kind === "string"
        ? expanded.kind
        : typeof expanded.eventType === "string"
          ? expanded.eventType
          : "unknown";
    this.logger.log(`YouTube webhook received kind=${kind}`);
    if (process.env.SOCIAL_YOUTUBE_WEBHOOK_DEBUG === "1") {
      this.logger.debug(JSON.stringify(expanded).slice(0, 2000));
    }
    if (process.env.SOCIAL_YOUTUBE_WEBHOOK_BRIDGE_ENABLED === "0") {
      return;
    }
    const parsed = parseYouTubeWebhookInbound(body);
    if (!parsed) {
      this.logger.debug(
        "YouTube webhook: no inbound message fields — skipped",
      );
      return;
    }
    const connection = await this.connectionRepository.findOne({
      where: {
        platformCode: ROADMAP_YOUTUBE,
        statusCode: SocialConnectionStatusCode.Connected,
        externalAccountId: parsed.channelId,
      },
    });
    if (!connection) {
      this.logger.warn(
        `YouTube webhook: no connection for channel_id=${parsed.channelId}`,
      );
      return;
    }
    const result = await this.messagingBridgeService.ingestWebhookInbound({
      companyId: connection.companyId,
      platformCode: ROADMAP_YOUTUBE,
      externalThreadId: parsed.externalThreadId,
      displayLabel: parsed.displayLabel,
      bodyText: parsed.bodyText,
      externalMessageId: parsed.externalMessageId,
    });
    if (result.ingested) {
      this.logger.log(
        `YouTube message bridged company=${connection.companyId} thread=${result.threadId}`,
      );
    }
  }
}
