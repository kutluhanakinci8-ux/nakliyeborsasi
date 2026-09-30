import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialPlatformCode } from "@nakliyeborsasi/core";
import { CompanySocialThreadLinkEntity } from "../../infrastructure/database/entities/CompanySocialThreadLinkEntity";
import { SocialHubMetaGraphService } from "./oauth/SocialHubMetaGraphService";
import { SocialHubTokenVaultService } from "./oauth/SocialHubTokenVaultService";

export type SocialOutboundDispatchResult = {
  attempted: boolean;
  ok: boolean;
  message: string;
};

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
  }): Promise<SocialOutboundDispatchResult> {
    const trimmed = params.bodyText.trim();
    if (!trimmed) {
      return { attempted: false, ok: true, message: "" };
    }
    const link = await this.linkRepository.findOne({
      where: {
        companyId: params.companyId,
        messageThreadId: params.messageThreadId,
        isOpen: true,
      },
    });
    if (!link) {
      return { attempted: false, ok: true, message: "" };
    }
    const platform = link.platformCode as SocialPlatformCode;
    if (link.externalThreadId.startsWith("demo-")) {
      const demoMessage =
        "Demo konuşması — gerçek kanala gönderilmez. OAuth ile bağlı hesaptan yanıtlayın.";
      await this.recordOutbound(link, false, demoMessage);
      return { attempted: true, ok: false, message: demoMessage };
    }
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
        await this.recordOutbound(link, false, result.message);
        this.logger.warn(
          `Social outbound failed thread=${params.messageThreadId} platform=${platform}: ${result.message}`,
        );
        return { attempted: true, ok: false, message: result.message };
      }
      await this.recordOutbound(link, true, null);
      return { attempted: true, ok: true, message: result.message };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      await this.recordOutbound(link, false, message);
      this.logger.warn(
        `Social outbound error thread=${params.messageThreadId}: ${message}`,
      );
      return { attempted: true, ok: false, message };
    }
  }

  private async recordOutbound(
    link: CompanySocialThreadLinkEntity,
    ok: boolean,
    errorMessage: string | null,
  ): Promise<void> {
    link.lastOutboundAt = new Date();
    link.lastOutboundStatus = ok ? "ok" : "failed";
    link.lastOutboundErrorMessage = ok ? null : errorMessage?.slice(0, 512) ?? null;
    await this.linkRepository.save(link);
  }
}
