import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUserContext, CompanyRoleCode } from "@nakliyeborsasi/core";
import { MessagingPublicApiScopeGuard } from "./MessagingPublicApiScopeGuard";
import { MessagingPublicApiContextParam } from "./MessagingPublicApiRequestParam";
import type { MessagingPublicApiRequestContext } from "./MessagingPublicApiAuthService";
import { MessagingPublicApiReadService } from "./MessagingPublicApiReadService";
import { MessagingPublicApiScope } from "./MessagingPublicApiScope";
import { MessagingThreadApplicationService } from "./MessagingThreadApplicationService";

@Controller("public/lerta-messaging/v1")
@UseGuards(MessagingPublicApiScopeGuard)
export class MessagingPublicApiController {
  public constructor(
    private readonly messagingPublicApiReadService: MessagingPublicApiReadService,
    private readonly messagingThreadApplicationService: MessagingThreadApplicationService,
  ) {}

  @Get("threads")
  @MessagingPublicApiScope("messaging:read")
  public async listThreads(
    @MessagingPublicApiContextParam() ctx: MessagingPublicApiRequestContext,
    @Query("limit") limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
    return this.messagingPublicApiReadService.listThreads(
      ctx.companyId,
      Number.isFinite(limit) ? limit : 50,
    );
  }

  @Get("threads/:threadId/messages")
  @MessagingPublicApiScope("messaging:read")
  public async listMessages(
    @MessagingPublicApiContextParam() ctx: MessagingPublicApiRequestContext,
    @Param("threadId") threadId: string,
    @Query("limit") limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 100;
    return this.messagingPublicApiReadService.listMessages(
      ctx.companyId,
      threadId,
      Number.isFinite(limit) ? limit : 100,
    );
  }

  @Post("threads/:threadId/messages")
  @MessagingPublicApiScope("messaging:write")
  public async sendMessage(
    @MessagingPublicApiContextParam() ctx: MessagingPublicApiRequestContext,
    @Param("threadId") threadId: string,
    @Body() body: { bodyText?: string; locale?: string },
  ) {
    const actor = new AuthenticatedUserContext({
      userId: ctx.actorUserId,
      companyId: ctx.companyId,
      emailAddress:
        ctx.credentialType === "bot"
          ? "messaging-bot@bots.lerta.internal"
          : "api-key@integration.lerta.internal",
      roleCodes: [CompanyRoleCode.Viewer],
    });
    const message = await this.messagingThreadApplicationService.sendMessage(
      actor,
      threadId,
      body.bodyText ?? "",
      body.locale ?? "tr",
    );
    return {
      messageId: message.id,
      threadId: message.threadId,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
