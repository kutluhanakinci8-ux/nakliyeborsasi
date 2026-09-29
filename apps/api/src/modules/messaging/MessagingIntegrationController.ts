import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { MessagingCompanyIntegrationService } from "./MessagingCompanyIntegrationService";
import type { MessagingWebhookEventType } from "../../infrastructure/database/entities/CompanyMessagingWebhookEndpointEntity";
import type { MessagingRetentionMode } from "../../infrastructure/database/entities/CompanyMessagingSettingsEntity";

@Controller("messaging/integration")
@UseGuards(JwtAuthenticationGuard)
export class MessagingIntegrationController {
  public constructor(
    private readonly messagingCompanyIntegrationService: MessagingCompanyIntegrationService,
  ) {}

  @Get()
  public async snapshot(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return {
      integration: await this.messagingCompanyIntegrationService.getSnapshot(user),
    };
  }

  @Post("webhooks")
  public async createWebhook(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      url: string;
      description?: string | null;
      events: MessagingWebhookEventType[];
      enabled?: boolean;
    },
  ) {
    return this.messagingCompanyIntegrationService.createWebhook(user, body);
  }

  @Patch("webhooks/:webhookId")
  public async updateWebhook(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("webhookId") webhookId: string,
    @Body()
    body: {
      url?: string;
      description?: string | null;
      events?: MessagingWebhookEventType[];
      enabled?: boolean;
      rotateSigningSecret?: boolean;
    },
  ) {
    return this.messagingCompanyIntegrationService.updateWebhook(
      user,
      webhookId,
      body,
    );
  }

  @Patch("retention")
  public async updateRetention(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      retentionDays: number | null;
      retentionMode?: MessagingRetentionMode;
    },
  ) {
    return {
      retention: await this.messagingCompanyIntegrationService.updateRetention(
        user,
        body,
      ),
    };
  }
}
