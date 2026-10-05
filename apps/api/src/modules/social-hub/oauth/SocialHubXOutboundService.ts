import { Injectable, Logger } from "@nestjs/common";
import { isXOutboundDeployEnabled } from "../socialHubXProdProvider";

const X_DM_MESSAGES_URL = "https://api.twitter.com/2/dm_conversations";

export type XOutboundDmResult = {
  ok: boolean;
  message: string;
  externalMessageId?: string;
};

@Injectable()
export class SocialHubXOutboundService {
  private readonly logger = new Logger(SocialHubXOutboundService.name);

  public async sendDirectMessage(params: {
    accessToken: string;
    participantUserId: string;
    bodyText: string;
  }): Promise<XOutboundDmResult> {
    if (!isXOutboundDeployEnabled()) {
      return {
        ok: false,
        message:
          "X DM giden mesaj kapalı — SOCIAL_X_OUTBOUND_ENABLED=1 ve dm.write scope gerekir.",
      };
    }
    const text = params.bodyText.trim();
    if (!text) {
      return { ok: false, message: "Mesaj metni boş." };
    }
    const response = await fetch(
      `${X_DM_MESSAGES_URL}/with/${params.participantUserId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      },
    );
    const payload = (await response.json()) as {
      data?: { dm_conversation_id?: string; dm_event_id?: string };
      errors?: Array<{ message?: string; detail?: string }>;
      detail?: string;
    };
    if (!response.ok) {
      const detail =
        payload.errors?.[0]?.detail ??
        payload.errors?.[0]?.message ??
        payload.detail ??
        "X DM gönderilemedi.";
      this.logger.warn(`X DM outbound failed: ${detail}`);
      return { ok: false, message: detail };
    }
    return {
      ok: true,
      message: "X DM gönderildi.",
      externalMessageId: payload.data?.dm_event_id,
    };
  }
}
