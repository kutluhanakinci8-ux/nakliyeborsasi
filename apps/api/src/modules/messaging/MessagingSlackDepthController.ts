import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { MessagingOrgChannelService } from "./MessagingOrgChannelService";
import { MessagingEnterpriseSearchService } from "./MessagingEnterpriseSearchService";
import { MessagingBotApplicationService } from "./MessagingBotApplicationService";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";

@Controller("messaging")
@UseGuards(JwtAuthenticationGuard)
export class MessagingSlackDepthController {
  public constructor(
    private readonly messagingOrgChannelService: MessagingOrgChannelService,
    private readonly messagingEnterpriseSearchService: MessagingEnterpriseSearchService,
    private readonly messagingBotApplicationService: MessagingBotApplicationService,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("channels")
  public async listChannels(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("lang") queryLanguage: string | undefined,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      undefined,
      queryLanguage,
    );
    await this.messagingThreadApplicationService.assertMessagingModule(
      user,
      locale,
    );
    const channels = await this.messagingOrgChannelService.listChannels(
      user.companyId,
    );
    return { channels };
  }

  @Post("channels")
  public async createChannel(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: { slug: string; name: string },
    @Query("lang") queryLanguage: string | undefined,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      undefined,
      queryLanguage,
    );
    await this.messagingThreadApplicationService.assertMessagingModule(
      user,
      locale,
    );
    const thread = await this.messagingOrgChannelService.createChannel(
      user,
      body,
    );
    return {
      channel: {
        threadId: thread.id,
        slug: thread.channelSlug,
        name: thread.channelName,
      },
    };
  }

  @Get("search")
  public async enterpriseSearch(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("q") q: string | undefined,
    @Query("limit") limitRaw: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ) {
    const locale = this.localeResolutionService.resolveFromHeaders(
      undefined,
      queryLanguage,
    );
    await this.messagingThreadApplicationService.assertMessagingModule(
      user,
      locale,
    );
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 40;
    return this.messagingEnterpriseSearchService.searchCompanyMessages(
      user,
      q ?? "",
      Number.isFinite(limit) ? limit : 40,
    );
  }

  @Get("bot")
  public async botConfig(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return {
      config: await this.messagingBotApplicationService.getBotConfig(user),
    };
  }

  @Post("bot/rotate-token")
  public async rotateBotToken(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return {
      config: await this.messagingBotApplicationService.rotateWebhookToken(user),
    };
  }
}
