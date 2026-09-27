import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import { MessagingTranslationService } from "./MessagingTranslationService";
import { OpenMessagingThreadRequestDto } from "./OpenMessagingThreadRequestDto";
import { SendThreadMessageRequestDto } from "./SendThreadMessageRequestDto";
import { TranslateMessagingTextRequestDto } from "./TranslateMessagingTextRequestDto";

@Controller("messaging")
@UseGuards(JwtAuthenticationGuard)
export class MessagingThreadController {
  public constructor(
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly messagingTranslationService: MessagingTranslationService,
    private readonly localeResolutionService: LocaleResolutionService,
  ) {}

  @Get("threads")
  public async listThreads(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ threads: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const threads = await this.messagingThreadApplicationService.listThreads(
      authenticatedUser,
      locale,
    );
    return { threads };
  }

  @Post("threads")
  public async openThread(
    @Body() body: OpenMessagingThreadRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ thread: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const thread = await this.messagingThreadApplicationService.openThread(
      authenticatedUser,
      body,
      locale,
    );
    return { thread };
  }

  @Get("threads/:threadId/messages")
  public async listMessages(
    @Param("threadId") threadId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ messages: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const messages =
      await this.messagingThreadApplicationService.listMessages(
        authenticatedUser,
        threadId,
        locale,
      );
    return { messages };
  }

  @Post("threads/:threadId/messages")
  public async sendMessage(
    @Param("threadId") threadId: string,
    @Body() body: SendThreadMessageRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ message: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const message = await this.messagingThreadApplicationService.sendMessage(
      authenticatedUser,
      threadId,
      body.bodyText,
      locale,
    );
    return { message };
  }

  @Get("export")
  public async exportArchive(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ export: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const exportPayload =
      await this.messagingThreadApplicationService.exportCompanyArchive(
        authenticatedUser,
        locale,
      );
    return { export: exportPayload };
  }

  @Post("translate")
  public async translateText(
    @Body() body: TranslateMessagingTextRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ translatedText: string; provider: string }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    await this.messagingThreadApplicationService.assertMessagingModule(
      authenticatedUser,
      locale,
    );
    return this.messagingTranslationService.translateText(
      body.text,
      body.targetLocale,
    );
  }

  @Get("threads/:threadId/summary")
  public async threadSummary(
    @Param("threadId") threadId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ summary: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const summary =
      await this.messagingThreadApplicationService.getThreadSummary(
        authenticatedUser,
        threadId,
        locale,
      );
    return { summary };
  }
}
