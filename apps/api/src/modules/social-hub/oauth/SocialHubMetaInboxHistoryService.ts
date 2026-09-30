import { Injectable, Logger } from "@nestjs/common";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { SocialHubMessagingBridgeService } from "../SocialHubMessagingBridgeService";

type ConversationsResponse = {
  data?: Array<{
    id: string;
    participants?: { data?: Array<{ id: string; name?: string }> };
    messages?: {
      data?: Array<{
        id: string;
        message?: string;
        from?: { id: string; name?: string };
        created_time?: string;
      }>;
    };
  }>;
  error?: { message: string };
};

@Injectable()
export class SocialHubMetaInboxHistoryService {
  private readonly logger = new Logger(SocialHubMetaInboxHistoryService.name);

  public constructor(
    private readonly messagingBridgeService: SocialHubMessagingBridgeService,
  ) {}

  public async importRecentMessengerThreads(params: {
    companyId: string;
    pageId: string;
    accessToken: string;
    maxThreads: number;
  }): Promise<number> {
    const url = new URL(
      `https://graph.facebook.com/v21.0/${params.pageId}/conversations`,
    );
    url.searchParams.set(
      "fields",
      "participants,messages.limit(3){id,message,from,created_time}",
    );
    url.searchParams.set("limit", String(params.maxThreads));
    url.searchParams.set("access_token", params.accessToken);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as ConversationsResponse;
    if (!response.ok || !payload.data?.length) {
      this.logger.warn(
        `Meta conversations import: ${payload.error?.message ?? "empty"}`,
      );
      return 0;
    }
    let imported = 0;
    for (const conversation of payload.data) {
      const participant = conversation.participants?.data?.find(
        (p) => p.id !== params.pageId,
      );
      const psid = participant?.id ?? conversation.id;
      const label = participant?.name ?? psid;
      const messages = conversation.messages?.data ?? [];
      for (const msg of messages) {
        const text = msg.message?.trim();
        if (!text || !msg.from || msg.from.id === params.pageId) {
          continue;
        }
        const result = await this.messagingBridgeService.ingestWebhookInbound({
          companyId: params.companyId,
          platformCode: SocialPlatformCode.FacebookMessenger,
          externalThreadId: psid,
          displayLabel: label,
          bodyText: text,
          externalMessageId: msg.id,
        });
        if (result.ingested) {
          imported += 1;
        }
      }
    }
    return imported;
  }

  public async importRecentInstagramThreads(params: {
    companyId: string;
    instagramBusinessAccountId: string;
    accessToken: string;
    maxThreads: number;
  }): Promise<number> {
    const url = new URL(
      `https://graph.facebook.com/v21.0/${params.instagramBusinessAccountId}/conversations`,
    );
    url.searchParams.set(
      "fields",
      "participants,messages.limit(3){id,message,from,created_time}",
    );
    url.searchParams.set("limit", String(params.maxThreads));
    url.searchParams.set("access_token", params.accessToken);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as ConversationsResponse;
    if (!response.ok || !payload.data?.length) {
      this.logger.warn(
        `Instagram conversations import: ${payload.error?.message ?? "empty"}`,
      );
      return 0;
    }
    let imported = 0;
    for (const conversation of payload.data) {
      const participant = conversation.participants?.data?.find(
        (p) => p.id !== params.instagramBusinessAccountId,
      );
      const scopedId = participant?.id ?? conversation.id;
      const label = participant?.name ?? scopedId;
      const messages = conversation.messages?.data ?? [];
      for (const msg of messages) {
        const text = msg.message?.trim();
        if (
          !text ||
          !msg.from ||
          msg.from.id === params.instagramBusinessAccountId
        ) {
          continue;
        }
        const result = await this.messagingBridgeService.ingestWebhookInbound({
          companyId: params.companyId,
          platformCode: SocialPlatformCode.Instagram,
          externalThreadId: scopedId,
          displayLabel: label,
          bodyText: text,
          externalMessageId: msg.id,
        });
        if (result.ingested) {
          imported += 1;
        }
      }
    }
    return imported;
  }
}
