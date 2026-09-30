import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import {
  parseSocialHubConnectionMetadata,
  serializeSocialHubConnectionMetadata,
  type SocialHubConnectionMetadata,
} from "./SocialHubConnectionMetadata";

type AccountsResponse = {
  data?: Array<{ id: string; name: string; access_token?: string }>;
  error?: { message: string };
};

type GraphErrorPayload = {
  error?: { message: string };
};

@Injectable()
export class SocialHubMetaGraphService {
  private readonly logger = new Logger(SocialHubMetaGraphService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
  ) {}

  public async enrichConnectionAfterOAuth(
    companyId: string,
    platformCode: SocialPlatformCode,
    userAccessToken: string,
  ): Promise<{ externalAccountId: string | null; displayName: string }> {
    if (platformCode === SocialPlatformCode.WhatsAppCloud) {
      return this.enrichWhatsAppConnection(companyId, userAccessToken);
    }
    return this.enrichPageBackedConnection(
      companyId,
      platformCode,
      userAccessToken,
    );
  }

  public async sendChannelTextMessage(params: {
    companyId: string;
    platformCode: SocialPlatformCode;
    accessToken: string;
    recipientExternalId: string;
    bodyText: string;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const connection = await this.connectionRepository.findOne({
      where: { companyId: params.companyId, platformCode: params.platformCode },
    });
    const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
    if (params.platformCode === SocialPlatformCode.WhatsAppCloud) {
      return this.sendWhatsAppText({
        phoneNumberId: metadata.phoneNumberId,
        accessToken: params.accessToken,
        to: params.recipientExternalId,
        bodyText: params.bodyText,
      });
    }
    const pageId =
      metadata.pageId ?? connection?.externalAccountId ?? undefined;
    if (!pageId) {
      return { ok: false, message: "Sayfa kimliği yok; OAuth yenileyin." };
    }
    const pageToken =
      await this.resolvePageAccessToken(params.accessToken, pageId);
    const tokenForSend = pageToken ?? params.accessToken;
    if (params.platformCode === SocialPlatformCode.Instagram) {
      return this.sendMessengerStyleText({
        pageId,
        accessToken: tokenForSend,
        recipientId: params.recipientExternalId,
        bodyText: params.bodyText,
        messagingType: "RESPONSE",
      });
    }
    if (params.platformCode === SocialPlatformCode.FacebookMessenger) {
      return this.sendMessengerStyleText({
        pageId,
        accessToken: tokenForSend,
        recipientId: params.recipientExternalId,
        bodyText: params.bodyText,
        messagingType: "RESPONSE",
      });
    }
    return {
      ok: false,
      message: "Bu kanal için giden mesaj henüz desteklenmiyor.",
    };
  }

  public async publishTextToPageFeed(params: {
    pageId: string;
    accessToken: string;
    bodyText: string;
  }): Promise<{ externalPostId: string | null; message: string }> {
    const url = new URL(`https://graph.facebook.com/v21.0/${params.pageId}/feed`);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: params.bodyText,
        access_token: params.accessToken,
      }),
    });
    const payload = (await response.json()) as {
      id?: string;
      error?: { message: string };
    };
    if (!response.ok) {
      return {
        externalPostId: null,
        message: payload.error?.message ?? "Meta feed yayını başarısız.",
      };
    }
    return {
      externalPostId: payload.id ?? null,
      message: "Meta feed yayını gönderildi.",
    };
  }

  public async resolvePageAccessToken(
    userAccessToken: string,
    pageId: string,
  ): Promise<string | null> {
    try {
      const accountsUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
      accountsUrl.searchParams.set("fields", "id,access_token");
      accountsUrl.searchParams.set("access_token", userAccessToken);
      const response = await fetch(accountsUrl.toString());
      const payload = (await response.json()) as AccountsResponse;
      const page = payload.data?.find((row) => row.id === pageId);
      return page?.access_token ?? null;
    } catch {
      return null;
    }
  }

  private async enrichPageBackedConnection(
    companyId: string,
    platformCode: SocialPlatformCode,
    userAccessToken: string,
  ): Promise<{ externalAccountId: string | null; displayName: string }> {
    try {
      const accountsUrl = new URL("https://graph.facebook.com/v21.0/me/accounts");
      accountsUrl.searchParams.set("fields", "id,name,access_token");
      accountsUrl.searchParams.set("access_token", userAccessToken);
      const response = await fetch(accountsUrl.toString());
      const payload = (await response.json()) as AccountsResponse;
      if (!response.ok || !payload.data?.length) {
        const meUrl = new URL("https://graph.facebook.com/v21.0/me");
        meUrl.searchParams.set("fields", "id,name");
        meUrl.searchParams.set("access_token", userAccessToken);
        const meRes = await fetch(meUrl.toString());
        const me = (await meRes.json()) as { id?: string; name?: string };
        return {
          externalAccountId: me.id ?? null,
          displayName: me.name ?? "Meta bağlantısı",
        };
      }
      const page = payload.data[0];
      const metadata: SocialHubConnectionMetadata = { pageId: page.id };
      if (platformCode === SocialPlatformCode.Instagram) {
        const igId = await this.fetchInstagramBusinessAccountId(
          page.id,
          page.access_token ?? userAccessToken,
        );
        if (igId) {
          metadata.instagramBusinessAccountId = igId;
        }
      }
      await this.mergeConnectionMetadata(companyId, platformCode, metadata);
      return {
        externalAccountId: page.id,
        displayName: page.name ?? "Meta sayfa",
      };
    } catch (error) {
      this.logger.warn(
        `Meta account enrich failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { externalAccountId: null, displayName: "Meta bağlantısı" };
    }
  }

  private async enrichWhatsAppConnection(
    companyId: string,
    userAccessToken: string,
  ): Promise<{ externalAccountId: string | null; displayName: string }> {
    try {
      const businessesUrl = new URL(
        "https://graph.facebook.com/v21.0/me/businesses",
      );
      businessesUrl.searchParams.set("fields", "id,name");
      businessesUrl.searchParams.set("access_token", userAccessToken);
      const bizRes = await fetch(businessesUrl.toString());
      const bizPayload = (await bizRes.json()) as {
        data?: Array<{ id: string; name?: string }>;
      };
      const business = bizPayload.data?.[0];
      if (!business?.id) {
        return {
          externalAccountId: null,
          displayName: "WhatsApp Cloud",
        };
      }
      const wabaUrl = new URL(
        `https://graph.facebook.com/v21.0/${business.id}/owned_whatsapp_business_accounts`,
      );
      wabaUrl.searchParams.set("fields", "id,name");
      wabaUrl.searchParams.set("access_token", userAccessToken);
      const wabaRes = await fetch(wabaUrl.toString());
      const wabaPayload = (await wabaRes.json()) as {
        data?: Array<{ id: string; name?: string }>;
      };
      const waba = wabaPayload.data?.[0];
      if (!waba?.id) {
        return {
          externalAccountId: null,
          displayName: business.name ?? "WhatsApp Cloud",
        };
      }
      const phonesUrl = new URL(
        `https://graph.facebook.com/v21.0/${waba.id}/phone_numbers`,
      );
      phonesUrl.searchParams.set("fields", "id,display_phone_number");
      phonesUrl.searchParams.set("access_token", userAccessToken);
      const phonesRes = await fetch(phonesUrl.toString());
      const phonesPayload = (await phonesRes.json()) as {
        data?: Array<{ id: string; display_phone_number?: string }>;
      };
      const phone = phonesPayload.data?.[0];
      await this.mergeConnectionMetadata(
        companyId,
        SocialPlatformCode.WhatsAppCloud,
        {
          wabaId: waba.id,
          phoneNumberId: phone?.id,
        },
      );
      return {
        externalAccountId: waba.id,
        displayName:
          phone?.display_phone_number ??
          waba.name ??
          business.name ??
          "WhatsApp Cloud",
      };
    } catch (error) {
      this.logger.warn(
        `WhatsApp enrich failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { externalAccountId: null, displayName: "WhatsApp Cloud" };
    }
  }

  private async fetchInstagramBusinessAccountId(
    pageId: string,
    accessToken: string,
  ): Promise<string | null> {
    const url = new URL(`https://graph.facebook.com/v21.0/${pageId}`);
    url.searchParams.set("fields", "instagram_business_account");
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as {
      instagram_business_account?: { id?: string };
    };
    return payload.instagram_business_account?.id ?? null;
  }

  private async mergeConnectionMetadata(
    companyId: string,
    platformCode: SocialPlatformCode,
    patch: SocialHubConnectionMetadata,
  ): Promise<void> {
    const row = await this.connectionRepository.findOne({
      where: { companyId, platformCode },
    });
    if (!row) {
      return;
    }
    const current = parseSocialHubConnectionMetadata(row.grantedScopes);
    row.grantedScopes = serializeSocialHubConnectionMetadata({
      ...current,
      ...patch,
    });
    await this.connectionRepository.save(row);
  }

  private async sendMessengerStyleText(params: {
    pageId: string;
    accessToken: string;
    recipientId: string;
    bodyText: string;
    messagingType: "RESPONSE" | "UPDATE";
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    const url = new URL(
      `https://graph.facebook.com/v21.0/${params.pageId}/messages`,
    );
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_type: params.messagingType,
        recipient: { id: params.recipientId },
        message: { text: params.bodyText },
        access_token: params.accessToken,
      }),
    });
    const payload = (await response.json()) as {
      message_id?: string;
      error?: { message: string };
    };
    if (!response.ok) {
      return {
        ok: false,
        message: payload.error?.message ?? "Meta mesaj gönderimi başarısız.",
      };
    }
    return {
      ok: true,
      message: "Mesaj kanala gönderildi.",
      externalMessageId: payload.message_id,
    };
  }

  private async sendWhatsAppText(params: {
    phoneNumberId?: string;
    accessToken: string;
    to: string;
    bodyText: string;
  }): Promise<{ ok: boolean; message: string; externalMessageId?: string }> {
    if (!params.phoneNumberId) {
      return {
        ok: false,
        message: "WhatsApp phone_number_id yok; OAuth yenileyin.",
      };
    }
    const url = new URL(
      `https://graph.facebook.com/v21.0/${params.phoneNumberId}/messages`,
    );
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: params.to,
        type: "text",
        text: { body: params.bodyText },
      }),
    });
    const payload = (await response.json()) as {
      messages?: Array<{ id: string }>;
    } & GraphErrorPayload;
    if (!response.ok) {
      return {
        ok: false,
        message: payload.error?.message ?? "WhatsApp mesaj gönderimi başarısız.",
      };
    }
    return {
      ok: true,
      message: "WhatsApp mesajı gönderildi.",
      externalMessageId: payload.messages?.[0]?.id,
    };
  }
}
