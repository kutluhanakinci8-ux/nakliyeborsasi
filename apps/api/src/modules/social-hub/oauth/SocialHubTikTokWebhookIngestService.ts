import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SocialHubTikTokWebhookIngestService {
  private readonly logger = new Logger(SocialHubTikTokWebhookIngestService.name);

  public async ingestPayload(body: Record<string, unknown>): Promise<void> {
    const event = typeof body.event === "string" ? body.event : "unknown";
    const clientKey =
      typeof body.client_key === "string" ? body.client_key : undefined;
    this.logger.log(
      `TikTok webhook received (skeleton) event=${event}${
        clientKey ? ` client_key=${clientKey.slice(0, 8)}…` : ""
      }`,
    );
    if (process.env.SOCIAL_TIKTOK_WEBHOOK_DEBUG === "1") {
      this.logger.debug(JSON.stringify(body).slice(0, 2000));
    }
  }
}
