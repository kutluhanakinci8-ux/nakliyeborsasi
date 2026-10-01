import { Injectable, Logger } from "@nestjs/common";
import { isYouTubeOutboundDeployEnabled } from "../socialHubYouTubeProdProvider";

const DEFAULT_SEND_URL =
  "https://www.googleapis.com/youtube/v3/placeholderOutboundMessage";

export type YouTubeOutboundSendResult = {
  ok: boolean;
  message: string;
  externalMessageId?: string;
};

@Injectable()
export class SocialHubYouTubeOutboundService {
  private readonly logger = new Logger(SocialHubYouTubeOutboundService.name);

  public async sendTextMessage(params: {
    accessToken: string;
    channelId: string;
    recipientExternalId: string;
    bodyText: string;
  }): Promise<YouTubeOutboundSendResult> {
    if (!isYouTubeOutboundDeployEnabled()) {
      return {
        ok: false,
        message:
          "YouTube giden mesaj kapalı — SOCIAL_YOUTUBE_OUTBOUND_ENABLED=1 ve API URL gerekir.",
      };
    }
    const url =
      process.env.SOCIAL_YOUTUBE_OUTBOUND_API_URL?.trim() || DEFAULT_SEND_URL;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.accessToken}`,
        },
        body: JSON.stringify({
          channel_id: params.channelId,
          thread_id: params.recipientExternalId,
          text: params.bodyText,
        }),
      });
      const payload = (await response.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        const detail =
          payload.error?.message ?? `YouTube API HTTP ${response.status}`;
        this.logger.warn(`YouTube outbound failed: ${detail}`);
        return { ok: false, message: detail };
      }
      return {
        ok: true,
        message: "YouTube mesajı gönderildi.",
        externalMessageId: payload.id ?? undefined,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`YouTube outbound error: ${detail}`);
      return { ok: false, message: detail };
    }
  }
}
