import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";

type AccountsResponse = {
  data?: Array<{ id: string; name: string; access_token?: string }>;
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
      const row = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      if (row && page.access_token) {
        row.grantedScopes = JSON.stringify({
          pageId: page.id,
          pageAccessTokenHint: "stored_on_user_token",
        });
        await this.connectionRepository.save(row);
      }
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
}
