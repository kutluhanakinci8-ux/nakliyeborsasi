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

@Injectable()
export class SocialHubPublishApplicationService {
  public constructor(
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaGraphService: SocialHubMetaGraphService,
    private readonly linkedInGraphService: SocialHubLinkedInGraphService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
  ) {}

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
    if (
      platformCode === SocialPlatformCode.FacebookMessenger ||
      platformCode === SocialPlatformCode.Instagram
    ) {
      const connection = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      const pageId = connection?.externalAccountId;
      if (!pageId) {
        return {
          implementationStatus: "pending",
          externalPostId: null,
          message: "Meta sayfa kimliği bulunamadı; OAuth yenileyin.",
        };
      }
      const result = await this.metaGraphService.publishTextToPageFeed({
        pageId,
        accessToken: token,
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
    return {
      implementationStatus: "pending",
      externalPostId: null,
      message: "Bilinmeyen platform.",
    };
  }
}
