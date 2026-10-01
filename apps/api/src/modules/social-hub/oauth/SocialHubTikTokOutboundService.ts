import { Injectable, Logger } from "@nestjs/common";
import { isTikTokOutboundDeployEnabled } from "../socialHubTikTokProdProvider";

const DEFAULT_SEND_URL =
  "https://business-api.tiktok.com/open_api/v1.3/business/message/send/";

export type TikTokOutboundSendResult = {
  ok: boolean;
  message: string;
  externalMessageId?: string;
};

@Injectable()
export class SocialHubTikTokOutboundService {
  private readonly logger = new Logger(SocialHubTikTokOutboundService.name);

  public async sendTextMessage(params: {
    accessToken: string;
    businessOpenId: string;
    recipientExternalId: string;
    bodyText: string;
  }): Promise<TikTokOutboundSendResult> {
    if (!isTikTokOutboundDeployEnabled()) {
      return {
        ok: false,
        message:
          "TikTok giden mesaj kapalı — SOCIAL_TIKTOK_OUTBOUND_ENABLED=1 ve API URL gerekir.",
      };
    }
    const url =
      process.env.SOCIAL_TIKTOK_OUTBOUND_API_URL?.trim() || DEFAULT_SEND_URL;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.accessToken}`,
        },
        body: JSON.stringify({
          business_id: params.businessOpenId,
          conversation_id: params.recipientExternalId,
          text: { body: params.bodyText },
        }),
      });
      const payload = (await response.json()) as {
        data?: { message_id?: string };
        message?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        const detail =
          payload.error?.message ??
          payload.message ??
          `TikTok API HTTP ${response.status}`;
        this.logger.warn(`TikTok outbound failed: ${detail}`);
        return { ok: false, message: detail };
      }
      return {
        ok: true,
        message: "TikTok mesajı gönderildi.",
        externalMessageId: payload.data?.message_id ?? undefined,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.warn(`TikTok outbound error: ${detail}`);
      return { ok: false, message: detail };
    }
  }
}
