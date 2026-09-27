import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { MessagingWebPushService } from "./MessagingWebPushService";
import {
  RegisterMessagingPushSubscriptionRequestDto,
  UnregisterMessagingPushSubscriptionRequestDto,
} from "./MessagingPushRequestDto";

@Controller("messaging/push")
@UseGuards(JwtAuthenticationGuard)
export class MessagingPushController {
  public constructor(
    private readonly messagingWebPushService: MessagingWebPushService,
  ) {}

  @Get("config")
  public getConfig() {
    return { config: this.messagingWebPushService.getPublicConfig() };
  }

  @Post("subscribe")
  public async subscribe(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: RegisterMessagingPushSubscriptionRequestDto,
    @Req() request: Request,
  ) {
    await this.messagingWebPushService.registerSubscription({
      userId: user.userId,
      companyId: user.companyId,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      userAgent: request.headers["user-agent"] ?? null,
    });
    return { ok: true };
  }

  @Post("unsubscribe")
  public async unsubscribe(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body() body: UnregisterMessagingPushSubscriptionRequestDto,
  ) {
    await this.messagingWebPushService.unregisterSubscription(
      user.userId,
      body.endpoint,
    );
    return { ok: true };
  }
}
