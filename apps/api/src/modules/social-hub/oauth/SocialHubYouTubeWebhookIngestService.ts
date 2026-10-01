import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SocialHubYouTubeWebhookIngestService {
  private readonly logger = new Logger(SocialHubYouTubeWebhookIngestService.name);

  public async ingestPayload(body: Record<string, unknown>): Promise<void> {
    const kind =
      typeof body.kind === "string"
        ? body.kind
        : typeof body.eventType === "string"
          ? body.eventType
          : "unknown";
    this.logger.log(`YouTube webhook received (skeleton) kind=${kind}`);
    if (process.env.SOCIAL_YOUTUBE_WEBHOOK_DEBUG === "1") {
      this.logger.debug(JSON.stringify(body).slice(0, 2000));
    }
  }
}
