import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { resolveMessagingClientRequestContext } from "./MessagingClientRequestContext";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { LocaleResolutionService } from "../localization/LocaleResolutionService";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";
import { MessagingTranslationService } from "./MessagingTranslationService";
import { PlatformSupportService } from "./PlatformSupportService";
import { OpenMessagingThreadRequestDto } from "./OpenMessagingThreadRequestDto";
import { OpenMessagingGroupThreadRequestDto } from "./OpenMessagingGroupThreadRequestDto";
import { SendThreadMessageRequestDto } from "./MessagingAttachmentRequestDto";
import { TranslateMessagingTextRequestDto } from "./TranslateMessagingTextRequestDto";
import { UpdateThreadMessageRequestDto } from "./UpdateThreadMessageRequestDto";

@Controller("messaging")
@UseGuards(JwtAuthenticationGuard)
export class MessagingThreadController {
  public constructor(
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
    private readonly messagingTranslationService: MessagingTranslationService,
    private readonly localeResolutionService: LocaleResolutionService,
    private readonly platformSupportService: PlatformSupportService,
  ) {}

  @Get("platform-support")
  public async platformSupport(
    @AuthenticatedUserParam() _authenticatedUser: AuthenticatedUserContext,
  ): Promise<{ supportCompanyId: string; legalName: string }> {
    return this.platformSupportService.resolveSupportCounterparty();
  }

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

  @Get("threads/:threadId/participants")
  public async listThreadParticipants(
    @Param("threadId") threadId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ participants: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.messagingThreadApplicationService.listThreadParticipants(
      authenticatedUser,
      threadId,
      locale,
    );
  }

  @Post("threads/group")
  public async openGroupThread(
    @Body() body: OpenMessagingGroupThreadRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ thread: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const thread = await this.messagingThreadApplicationService.openGroupThread(
      authenticatedUser,
      body,
      locale,
    );
    return { thread };
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
    @Req() request: Request,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ message: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const clientContext = resolveMessagingClientRequestContext(request);
    const message = await this.messagingThreadApplicationService.sendMessage(
      authenticatedUser,
      threadId,
      body.bodyText ?? "",
      locale,
      body.attachments,
      body.messageKind === "internal" ? "internal" : "public",
      clientContext,
      request.path,
    );
    return { message };
  }

  @Post("threads/:threadId/typing")
  public async typing(
    @Param("threadId") threadId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ ok: true }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    await this.messagingThreadApplicationService.recordTyping(
      authenticatedUser,
      threadId,
      locale,
    );
    return { ok: true };
  }

  @Get("colleagues")
  public async colleagues(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ colleagues: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const colleagues =
      await this.messagingThreadApplicationService.listColleagues(
        authenticatedUser,
        locale,
      );
    return { colleagues };
  }

  @Get("companies/search")
  public async searchCompanies(
    @Query("q") query: string,
    @Query("limit") limitRaw: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ query: string; companies: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 15;
    return this.messagingThreadApplicationService.searchCompanies(
      authenticatedUser,
      locale,
      query ?? "",
      Number.isFinite(limit) ? limit : 15,
    );
  }

  @Get("hub-default")
  public async messagingHubDefault(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ defaultTab: "email" | "chat" }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.messagingThreadApplicationService.getMessagingHubDefault(
      authenticatedUser,
      locale,
    );
  }

  @Patch("hub-default")
  public async updateMessagingHubDefault(
    @Body() body: { defaultTab?: string },
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ defaultTab: "email" | "chat" }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const raw = body.defaultTab?.trim().toLowerCase();
    const defaultTab =
      raw === "chat" || raw === "sohbet" ? "chat" : "email";
    return this.messagingThreadApplicationService.updateMessagingHubDefault(
      authenticatedUser,
      locale,
      defaultTab,
    );
  }

  @Patch("threads/:threadId/messages/:messageId")
  public async updateMessage(
    @Param("threadId") threadId: string,
    @Param("messageId") messageId: string,
    @Body() body: UpdateThreadMessageRequestDto,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Req() request: Request,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ message: unknown }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const clientContext = resolveMessagingClientRequestContext(request);
    const message = await this.messagingThreadApplicationService.editMessage(
      authenticatedUser,
      threadId,
      messageId,
      body.bodyText ?? "",
      locale,
      clientContext,
      request.path,
    );
    return { message };
  }

  @Delete("threads/:threadId/messages/:messageId")
  public async deleteMessage(
    @Param("threadId") threadId: string,
    @Param("messageId") messageId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Req() request: Request,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ ok: true }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const clientContext = resolveMessagingClientRequestContext(request);
    await this.messagingThreadApplicationService.softDeleteMessage(
      authenticatedUser,
      threadId,
      messageId,
      locale,
      clientContext,
      request.path,
    );
    return { ok: true };
  }

  @Get("threads/:threadId/messages/:messageId/attachments/:index")
  public async downloadAttachment(
    @Param("threadId") threadId: string,
    @Param("messageId") messageId: string,
    @Param("index", ParseIntPipe) index: number,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const file = await this.messagingThreadApplicationService.getMessageAttachment(
      authenticatedUser,
      threadId,
      messageId,
      index,
      locale,
    );
    response.setHeader("Content-Type", file.contentType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(file.filename)}"`,
    );
    response.send(file.buffer);
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

  @Get("search")
  public async search(
    @Query("q") query: string,
    @Query("limit") limitRaw: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ query: string; results: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 40;
    return this.messagingThreadApplicationService.searchMessages(
      authenticatedUser,
      locale,
      query ?? "",
      Number.isFinite(limit) ? limit : 40,
    );
  }

  @Get("quick-replies")
  public async quickReplies(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ templates: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.messagingThreadApplicationService.listQuickReplies(
      authenticatedUser,
      locale,
    );
  }

  @Get("quick-replies/org")
  public async orgQuickReplies(
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ templates: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.messagingThreadApplicationService.getOrgQuickReplies(
      authenticatedUser,
      locale,
    );
  }

  @Put("quick-replies/org")
  public async replaceOrgQuickReplies(
    @Body() body: { templates?: unknown[] },
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ templates: unknown[] }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const templates = Array.isArray(body.templates) ? body.templates : [];
    return this.messagingThreadApplicationService.replaceOrgQuickReplies(
      authenticatedUser,
      locale,
      templates as import("../../infrastructure/database/entities/CompanyMessagingSettingsEntity").CompanyOrgQuickReplyTemplate[],
    );
  }

  @Post("threads/:threadId/messages/:messageId/stamp")
  public async stampMessage(
    @Param("threadId") threadId: string,
    @Param("messageId") messageId: string,
    @Body() body: { stampType?: string },
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Req() request: Request,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ stampType: string; messageId: string }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const clientContext = resolveMessagingClientRequestContext(request);
    const raw = body.stampType?.trim().toLowerCase();
    const stampType =
      raw === "approved" || raw === "rejected" || raw === "acknowledged"
        ? raw
        : "acknowledged";
    return this.messagingThreadApplicationService.applyOperationStamp(
      authenticatedUser,
      threadId,
      messageId,
      stampType,
      locale,
      clientContext,
      request.path,
    );
  }

  @Post("threads/:threadId/actions/accept-fixed-price")
  public async acceptFixedPrice(
    @Param("threadId") threadId: string,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{ sessionId: string; bidId: string; systemMessageId: string }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    return this.messagingThreadApplicationService.acceptFixedPriceFromThread(
      authenticatedUser,
      threadId,
      locale,
    );
  }

  @Get("threads/:threadId/summary")
  public async threadSummary(
    @Param("threadId") threadId: string,
    @Query("llm") llmFlag: string | undefined,
    @AuthenticatedUserParam() authenticatedUser: AuthenticatedUserContext,
    @Headers("accept-language") acceptLanguage: string | undefined,
    @Query("lang") queryLanguage: string | undefined,
  ): Promise<{
    summary: unknown;
    listingCard: unknown;
    offerTimeline: unknown;
    llmSummary: unknown;
  }> {
    const locale = this.localeResolutionService.resolveFromHeaders(
      acceptLanguage,
      queryLanguage,
    );
    const payload =
      await this.messagingThreadApplicationService.getThreadSummary(
        authenticatedUser,
        threadId,
        locale,
        { includeLlm: llmFlag === "1" || llmFlag === "true" },
      );
    return payload;
  }
}
