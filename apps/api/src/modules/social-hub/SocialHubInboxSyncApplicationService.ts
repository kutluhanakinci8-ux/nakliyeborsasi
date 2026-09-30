import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import { SocialHubMetaInboxHistoryService } from "./oauth/SocialHubMetaInboxHistoryService";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import type { SocialInboxSyncResult } from "./providers/SocialProviderPort";

@Injectable()
export class SocialHubInboxSyncApplicationService {
  public constructor(
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaInboxHistoryService: SocialHubMetaInboxHistoryService,
    private readonly metaGraphService: SocialHubMetaGraphService,
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
    if (platformCode === SocialPlatformCode.Instagram) {
      const connection = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
      const igId = metadata.instagramBusinessAccountId;
      const pageId = metadata.pageId ?? connection?.externalAccountId;
      if (!igId || !pageId) {
        return {
          implementationStatus: "pending",
          importedThreadCount: 0,
          message: "Instagram işletme hesabı yok; OAuth yenileyin.",
        };
      }
      const pageToken = await this.metaGraphService.resolvePageAccessToken(
        token,
        pageId,
      );
      const accessToken = pageToken ?? token;
      const imported =
        await this.metaInboxHistoryService.importRecentInstagramThreads({
          companyId,
          instagramBusinessAccountId: igId,
          accessToken,
          maxThreads: 8,
        });
      return {
        implementationStatus: "ready",
        importedThreadCount: imported,
        message:
          imported > 0
            ? `${imported} Instagram DM Mesajlar’a aktarıldı.`
            : "Yeni Instagram DM bulunamadı (webhook aktif).",
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
