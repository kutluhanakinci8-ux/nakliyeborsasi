import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialConnectionEntity } from "../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { SocialHubLinkedInGraphService } from "./oauth/SocialHubLinkedInGraphService";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";
import type {
  SocialPublishRequest,
  SocialPublishResult,
} from "./providers/SocialProviderPort";
import { SocialHubPublishMediaStorageService } from "./SocialHubPublishMediaStorageService";
import { parseSocialHubMediaRef } from "./socialHubPublishMedia";
import { parseSocialHubConnectionMetadata } from "./oauth/SocialHubConnectionMetadata";
import { SocialHubTelegramPublishService } from "./oauth/SocialHubTelegramPublishService";

@Injectable()
export class SocialHubPublishApplicationService {
  public constructor(
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaGraphService: SocialHubMetaGraphService,
    private readonly linkedInGraphService: SocialHubLinkedInGraphService,
    private readonly publishMediaStorage: SocialHubPublishMediaStorageService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly telegramPublishService: SocialHubTelegramPublishService,
  ) {}

  private async resolveFirstMediaAsset(
    companyId: string,
    mediaUrls: string[],
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const all = await this.resolveAllMediaAssets(companyId, mediaUrls);
    return all[0] ?? null;
  }

  private async resolveAllMediaAssets(
    companyId: string,
    mediaUrls: string[],
  ): Promise<Array<{ buffer: Buffer; contentType: string; filename: string }>> {
    const assets: Array<{
      buffer: Buffer;
      contentType: string;
      filename: string;
    }> = [];
    for (const ref of mediaUrls) {
      const parsed = parseSocialHubMediaRef(ref);
      if (!parsed) {
        continue;
      }
      const { buffer, meta } = await this.publishMediaStorage.readForCompany(
        companyId,
        parsed.mediaId,
      );
      assets.push({
        buffer,
        contentType: meta.contentType,
        filename: meta.filename,
      });
    }
    return assets;
  }

  public async publish(
    companyId: string,
    platformCode: SocialPlatformCode,
    request: SocialPublishRequest,
  ): Promise<SocialPublishResult> {
    const token = await this.tokenVault.getAccessToken(companyId, platformCode);
    if (!token) {
      return {
        implementationStatus: "pending",
        externalPostId: null,
        message: "OAuth token yok; yayın API çağrısı yapılamadı.",
      };
    }
    const mediaAsset = await this.resolveFirstMediaAsset(
      companyId,
      request.mediaUrls,
    );
    if (
      platformCode === SocialPlatformCode.FacebookMessenger ||
      platformCode === SocialPlatformCode.Instagram
    ) {
      const connection = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
      const pageId = metadata.pageId ?? connection?.externalAccountId;
      if (!pageId) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message: "Meta sayfa kimliği bulunamadı; OAuth yenileyin.",
        };
      }
      const pageToken =
        (await this.metaGraphService.resolvePageAccessToken(token, pageId)) ??
        token;
      if (platformCode === SocialPlatformCode.Instagram) {
        const igId = metadata.instagramBusinessAccountId;
        if (!igId) {
          return {
            implementationStatus: "pending",
            externalPostId: null,
            message: "Instagram Business hesap kimliği yok; OAuth yenileyin.",
          };
        }
        if (!mediaAsset) {
          return {
            implementationStatus: "pending",
            externalPostId: null,
            message:
              "Instagram feed yayını için en az bir görsel ekleyin (Metin + medya).",
          };
        }
        const result = await this.metaGraphService.publishPhotoToInstagram({
          instagramBusinessAccountId: igId,
          accessToken: pageToken,
          caption: request.bodyText,
          imageBuffer: mediaAsset.buffer,
          filename: mediaAsset.filename,
          contentType: mediaAsset.contentType,
        });
        if (!result.externalPostId) {
          return {
            implementationStatus: "pending",
            externalPostId: null,
            message: result.message,
          };
        }
        return {
          implementationStatus: "ready",
          externalPostId: result.externalPostId,
          message: result.message,
        };
      }
      const result = mediaAsset
        ? await this.metaGraphService.publishPhotoToPageFeed({
            pageId,
            accessToken: pageToken,
            bodyText: request.bodyText,
            imageBuffer: mediaAsset.buffer,
            filename: mediaAsset.filename,
            contentType: mediaAsset.contentType,
          })
        : await this.metaGraphService.publishTextToPageFeed({
            pageId,
            accessToken: pageToken,
            bodyText: request.bodyText,
          });
      if (!result.externalPostId) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message: result.message,
        };
      }
      return {
        implementationStatus: "ready",
        externalPostId: result.externalPostId,
        message: result.message,
      };
    }
    if (platformCode === SocialPlatformCode.LinkedIn) {
      if (mediaAsset) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message:
            "LinkedIn görsel yayını henüz desteklenmiyor; metin gönderisi için görseli kaldırın.",
        };
      }
      const authorUrn = await this.linkedInGraphService.resolveAuthorUrn(token);
      if (!authorUrn) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message: "LinkedIn kullanıcı URN alınamadı; OAuth yenileyin.",
        };
      }
      const result = await this.linkedInGraphService.publishTextPost({
        accessToken: token,
        authorUrn,
        bodyText: request.bodyText,
      });
      if (!result.externalPostId) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message: result.message,
        };
      }
      return {
        implementationStatus: "ready",
        externalPostId: result.externalPostId,
        message: result.message,
      };
    }
    if (platformCode === SocialPlatformCode.WhatsAppCloud) {
      return {
        implementationStatus: "pending",
        externalPostId: null,
        message: "WhatsApp şablon yayını bu kanalda desteklenmiyor.",
      };
    }
    if (platformCode === SocialPlatformCode.Telegram) {
      const allMedia = await this.resolveAllMediaAssets(
        companyId,
        request.mediaUrls,
      );
      const visualMedia = allMedia.filter(
        (item) =>
          item.contentType.startsWith("image/") ||
          item.contentType.startsWith("video/"),
      );
      if (allMedia.length > 0 && visualMedia.length === 0) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message:
            "Telegram kanal yayını için görsel veya video kullanın; diğer dosya türleri henüz desteklenmiyor.",
        };
      }
      if (allMedia.length > visualMedia.length) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message:
            "Telegram kanal albümünde yalnızca görsel ve video desteklenir; desteklenmeyen dosyayı kaldırın.",
        };
      }
      const result = await this.telegramPublishService.publishToChannel({
        companyId,
        bodyText: request.bodyText,
        media: visualMedia,
      });
      if (!result.ok) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message: result.message,
        };
      }
      return {
        implementationStatus: "ready",
        externalPostId: result.externalPostId ?? null,
        message: result.message,
      };
    }
    return {
      implementationStatus: "pending",
      externalPostId: null,
      message: "Bilinmeyen platform.",
    };
  }
}
