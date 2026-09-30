import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";

@Injectable()
export class SocialHubOutboundMessagingService {
  private readonly logger = new Logger(SocialHubOutboundMessagingService.name);

  public constructor(
    @InjectRepository(CompanySocialThreadLinkEntity)
    private readonly linkRepository: Repository<CompanySocialThreadLinkEntity>,
    private readonly tokenVault: SocialHubTokenVaultService,
    private readonly metaGraphService: SocialHubMetaGraphService,
  ) {}

  public async tryDispatchOutbound(params: {
    companyId: string;
    messageThreadId: string;
    bodyText: string;
  }): Promise<void> {
    const trimmed = params.bodyText.trim();
    if (!trimmed) {
      return;
    }
    const link = await this.linkRepository.findOne({
      where: {
        companyId: params.companyId,
        messageThreadId: params.messageThreadId,
        isOpen: true,
      },
    });
    if (!link) {
      return;
    }
    const platform = link.platformCode as SocialPlatformCode;
    try {
      const token = await this.tokenVault.requireAccessToken(
        params.companyId,
        platform,
      );
      const result = await this.metaGraphService.sendChannelTextMessage({
        companyId: params.companyId,
        platformCode: platform,
        accessToken: token,
        recipientExternalId: link.externalThreadId,
        bodyText: trimmed,
      });
      if (!result.ok) {
        this.logger.warn(
          `Social outbound failed thread=${params.messageThreadId} platform=${platform}: ${result.message}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Social outbound error thread=${params.messageThreadId}: ${message}`,
      );
    }
  }
}
