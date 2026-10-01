import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { buildSocialHubPublicWebhookUrls } from "./socialHubIntegrationUrls";
import { assertRoadmapPlatformCode } from "./socialHubRoadmapInterest";
import { labelSocialPlatform } from "./socialHubPlatformLabels";
import type { SocialInboxSyncResult } from "./providers/SocialProviderPort";

@Injectable()
export class SocialHubRoadmapInboxSyncService {
  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly threadLinkRepository: Repository<CompanySocialThreadLinkEntity>,
  ) {}

  public async summarize(
    companyId: string,
    platformCode: string,
  ): Promise<SocialInboxSyncResult> {
    const code = assertRoadmapPlatformCode(platformCode);
    const connection = await this.connectionRepository.findOne({
      where: { companyId, platformCode: code },
    });
    if (
      !connection ||
      connection.statusCode !== SocialConnectionStatusCode.Connected
    ) {
      throw new ValidationException(
        `${labelSocialPlatform(code)} beta bağlantısı yok — önce OAuth ile bağlayın.`,
      );
    }
    const openCount = await this.threadLinkRepository.count({
      where: { companyId, platformCode: code, isOpen: true },
    });
    const urls = buildSocialHubPublicWebhookUrls();
    const webhookUrl =
      code === "TIKTOK" ? urls.tiktok : code === "YOUTUBE" ? urls.youtube : "";
    return {
      implementationStatus: "ready",
      importedThreadCount: openCount,
      message:
        openCount > 0
          ? `${openCount} açık ${labelSocialPlatform(code)} konuşması Mesajlar’da. Yeni mesajlar webhook ile düşer (${webhookUrl}).`
          : `Geçmiş API taraması yok; webhook’u yapılandırın (${webhookUrl}). Gelen mesajlar otomatik köprülenir.`,
    };
  }
}
