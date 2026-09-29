import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { MessagingPublicApiGuard } from "./MessagingPublicApiGuard";
import { MessagingPublicApiContextParam } from "./MessagingPublicApiRequestParam";
import type { MessagingPublicApiRequestContext } from "./MessagingPublicApiGuard";
import { MessagingPublicApiReadService } from "./MessagingPublicApiReadService";

@Controller("public/lerta-messaging/v1")
@UseGuards(MessagingPublicApiGuard)
export class MessagingPublicApiController {
  public constructor(
    private readonly messagingPublicApiReadService: MessagingPublicApiReadService,
  ) {}

  @Get("threads")
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
}
