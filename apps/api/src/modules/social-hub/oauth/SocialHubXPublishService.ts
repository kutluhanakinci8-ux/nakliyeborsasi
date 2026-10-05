import { Injectable, Logger } from "@nestjs/common";
import { isXPublishDeployEnabled } from "../socialHubXProdProvider";

const X_TWEETS_URL = "https://api.twitter.com/2/tweets";

export type XPublishResult = {
  ok: boolean;
  externalPostId: string | null;
  message: string;
};

@Injectable()
export class SocialHubXPublishService {
  private readonly logger = new Logger(SocialHubXPublishService.name);

  public async publishTextTweet(params: {
    accessToken: string;
    bodyText: string;
    hasMedia: boolean;
  }): Promise<XPublishResult> {
    if (!isXPublishDeployEnabled()) {
      return {
        ok: false,
        externalPostId: null,
        message:
          "X tweet yayını kapalı — SOCIAL_X_PUBLISH_ENABLED=1 ile açın.",
      };
    }
    if (params.hasMedia) {
      return {
        ok: false,
        externalPostId: null,
        message:
          "X görsel tweet henüz desteklenmiyor; yalnızca metin gönderisi kullanın.",
      };
    }
    const text = params.bodyText.trim();
    if (!text) {
      return {
        ok: false,
        externalPostId: null,
        message: "Tweet metni boş.",
      };
    }
    if (text.length > 280) {
      return {
        ok: false,
        externalPostId: null,
        message: "Tweet 280 karakterden uzun.",
      };
    }
    const response = await fetch(X_TWEETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const payload = (await response.json()) as {
      data?: { id?: string };
      errors?: Array<{ message?: string; detail?: string }>;
      detail?: string;
    };
    if (!response.ok) {
      const detail =
        payload.errors?.[0]?.detail ??
        payload.errors?.[0]?.message ??
        payload.detail ??
        "X tweet API hatası.";
      this.logger.warn(`X publish failed: ${detail}`);
      return { ok: false, externalPostId: null, message: detail };
    }
    const id = payload.data?.id ?? null;
    return {
      ok: Boolean(id),
      externalPostId: id,
      message: id ? "Tweet yayınlandı." : "Tweet yanıtı geçersiz.",
    };
  }
}
