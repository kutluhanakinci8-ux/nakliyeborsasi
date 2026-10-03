import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubMetaInboxHistoryService } from "./oauth/SocialHubMetaInboxHistoryService";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import { SocialHubOAuthConfigService } from "./oauth/SocialHubOAuthConfigService";
import type { SocialInboxSyncResult } from "./providers/SocialProviderPort";
import { linkedInInboxSyncDeferredMessage } from "./socialHubLinkedInDmCapability";

@Injectable()
export class SocialHubInboxSyncApplicationService {
  public constructor(
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaInboxHistoryService: SocialHubMetaInboxHistoryService,
    private readonly metaGraphService: SocialHubMetaGraphService,
    private readonly oauthConfig: SocialHubOAuthConfigService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
  ) {}

  public async sync(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<SocialInboxSyncResult> {
    const token = await this.tokenVault.getAccessToken(companyId, platformCode);
    if (!token) {
      return {
        implementationStatus: "pending",
        importedThreadCount: 0,
        message: "Token yok; gelen kutusu webhook ile güncellenir.",
      };
    }
    if (platformCode === SocialPlatformCode.FacebookMessenger) {
      const connection = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      const pageId = connection?.externalAccountId;
      if (!pageId) {
        return {
          implementationStatus: "pending",
          importedThreadCount: 0,
          message: "Sayfa kimliği yok; OAuth yenileyin.",
        };
      }
      const imported =
        await this.metaInboxHistoryService.importRecentMessengerThreads({
          companyId,
          pageId,
          accessToken: token,
          maxThreads: 8,
        });
      return {
        implementationStatus: "ready",
        importedThreadCount: imported,
        message:
          imported > 0
            ? `${imported} mesaj Mesajlar’a aktarıldı.`
            : "Yeni geçmiş mesaj bulunamadı (webhook aktif).",
      };
    }
    if (platformCode === SocialPlatformCode.LinkedIn) {
      return {
        implementationStatus: "pending",
        importedThreadCount: 0,
        message: linkedInInboxSyncDeferredMessage(),
      };
    }
    if (platformCode === SocialPlatformCode.Instagram) {
      const connection = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
      const pageId = metadata.pageId;
      const knownIgId =
        this.oauthConfig.getKnownInstagramBusinessAccountId()?.trim() ?? null;
      const igId =
        metadata.instagramBusinessAccountId ??
        (connection?.externalAccountId &&
        connection.externalAccountId !== pageId
          ? connection.externalAccountId
          : null) ??
        knownIgId;
      if (!igId) {
        return {
          implementationStatus: "pending",
          importedThreadCount: 0,
          message:
            "Instagram işletme hesabı kimliği eksik — OAuth veya SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID.",
        };
      }
      let accessToken = token;
      if (pageId) {
        const pageToken = await this.metaGraphService.resolvePageAccessToken(
          token,
          pageId,
        );
        accessToken = pageToken ?? token;
      }
      const importResult = pageId
        ? await this.metaInboxHistoryService.importRecentInstagramThreads({
            companyId,
            pageId,
            instagramBusinessAccountId: igId,
            accessToken,
            maxThreads: 8,
          })
        : {
            imported: await this.metaInboxHistoryService.importRecentInstagramLoginThreads(
              {
                companyId,
                instagramBusinessAccountId: igId,
                accessToken,
                maxThreads: 8,
              },
            ),
          };
      const imported = importResult.imported;
      return {
        implementationStatus: importResult.graphError ? "pending" : "ready",
        importedThreadCount: imported,
        message:
          importResult.graphError ??
          (imported > 0
            ? `${imported} Instagram DM Mesajlar’a aktarıldı.`
            : "Yeni Instagram DM bulunamadı (webhook veya müşteri test mesajı bekleniyor)."),
      };
    }
    return {
      implementationStatus: "ready",
      importedThreadCount: 0,
      message:
        "Bu kanal için geçmiş tarama yok; canlı mesajlar webhook ile düşer.",
    };
  }
}
