import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { SocialHubApplicationService } from "./SocialHubApplicationService";

@Controller("company/social-hub")
@UseGuards(JwtAuthenticationGuard)
export class SocialHubController {
  public constructor(
    private readonly socialHubApplicationService: SocialHubApplicationService,
  ) {}

  @Get()
  public async snapshot(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return {
      hub: await this.socialHubApplicationService.getHubSnapshot(user),
    };
  }

  @Post("connections/:platformCode/connect")
  public async connect(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.startConnect(user, platformCode);
  }

  @Post("connections/:platformCode/disconnect")
  public async disconnect(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.disconnect(user, platformCode);
  }

  @Post("inbox/seed-demo")
  public async seedDemoInbox(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.seedDemoInbox(user);
  }

  @Post("connections/:platformCode/sync-inbox")
  public async syncInbox(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.syncInbox(user, platformCode);
  }

  @Post("posts")
  public async createPost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      bodyText: string;
      platformCodes: string[];
      mediaUrls?: string[];
    },
  ) {
    return this.socialHubApplicationService.createPost(user, body);
  }

  @Patch("posts/:postId")
  public async updatePost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("postId") postId: string,
    @Body()
    body: {
      bodyText?: string;
      platformCodes?: string[];
      mediaUrls?: string[];
      scheduledAt?: string | null;
    },
  ) {
    return this.socialHubApplicationService.updatePost(user, postId, body);
  }

  @Post("posts/:postId/publish")
  public async publishPost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("postId") postId: string,
  ) {
    return this.socialHubApplicationService.publishPost(user, postId);
  }

  @Delete("posts/:postId")
  public async deletePost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("postId") postId: string,
  ) {
    return this.socialHubApplicationService.deletePost(user, postId);
  }

  @Post("posts/:postId/submit-approval")
  public async submitForApproval(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("postId") postId: string,
  ) {
    return this.socialHubApplicationService.submitPostForApproval(user, postId);
  }

  @Post("posts/:postId/approve")
  public async approvePost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("postId") postId: string,
  ) {
    return this.socialHubApplicationService.approvePost(user, postId);
  }

  @Post("posts/:postId/cancel")
  public async cancelPost(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("postId") postId: string,
  ) {
    return this.socialHubApplicationService.cancelPost(user, postId);
  }

  @Post("templates")
  public async createTemplate(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: { title: string; bodyText: string; channelScopeCode?: string | null },
  ) {
    return this.socialHubApplicationService.createTemplate(user, body);
  }

  @Patch("templates/:templateId")
  public async updateTemplate(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("templateId") templateId: string,
    @Body()
    body: {
      title?: string;
      bodyText?: string;
      channelScopeCode?: string | null;
      sortOrder?: number;
    },
  ) {
    return this.socialHubApplicationService.updateTemplate(user, templateId, body);
  }

  @Delete("templates/:templateId")
  public async deleteTemplate(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("templateId") templateId: string,
  ) {
    return this.socialHubApplicationService.deleteTemplate(user, templateId);
  }

  @Get("health")
  public async health(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.getConnectionHealth(user);
  }

  @Post("connections/:platformCode/refresh-token")
  public async refreshToken(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.refreshConnectionToken(
      user,
      platformCode,
    );
  }

  @Get("delivery-log")
  public async deliveryLog(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("threadId") threadId?: string,
    @Query("limit") limit?: string,
    @Query("platformCode") platformCode?: string,
    @Query("status") status?: string,
    @Query("since") since?: string,
    @Query("until") until?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const normalizedStatus =
      status === "ok" || status === "failed" ? status : undefined;
    return this.socialHubApplicationService.listOutboundDeliveries(user, {
      threadId: threadId?.trim() || undefined,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      platformCode: platformCode?.trim() || undefined,
      status: normalizedStatus,
      since: since?.trim() || undefined,
      until: until?.trim() || undefined,
    });
  }

  @Get("delivery-log/export")
  public async exportDeliveryLog(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Res() response: Response,
    @Query("threadId") threadId?: string,
    @Query("platformCode") platformCode?: string,
    @Query("status") status?: string,
    @Query("since") since?: string,
    @Query("until") until?: string,
    @Query("limit") limit?: string,
  ): Promise<void> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const normalizedStatus =
      status === "ok" || status === "failed" ? status : undefined;
    const csv = await this.socialHubApplicationService.exportOutboundDeliveriesCsv(
      user,
      {
        threadId: threadId?.trim() || undefined,
        platformCode: platformCode?.trim() || undefined,
        status: normalizedStatus,
        since: since?.trim() || undefined,
        until: until?.trim() || undefined,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      },
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="social-hub-deliveries.csv"',
    );
    response.send(csv);
  }

  @Get("analytics")
  public async analytics(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.getAnalytics(user);
  }

  @Get("team")
  public async listTeam(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.listTeam(user);
  }

  @Patch("team/:userId/role")
  public async updateMemberRole(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("userId") userId: string,
    @Body() body: { roleCode: string },
  ) {
    return this.socialHubApplicationService.updateMemberRole(
      user,
      userId,
      body.roleCode,
    );
  }

  @Get("audit-log")
  public async listAuditLog(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.listAuditLog(user);
  }

  @Patch("settings")
  public async updateSettings(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      inboxEnabled?: boolean;
      publishingEnabled?: boolean;
      dispatcherCanReply?: boolean;
      dispatcherCanPublish?: boolean;
      ownerApprovalRequired?: boolean;
      acceptKvkk?: boolean;
      healthAlertsEnabled?: boolean;
      healthAlertMinSeverity?: "attention" | "critical";
      healthAlertFailureThreshold?: number;
      healthAlertPlatformThresholdsJson?: string | null;
      socialSlackWebhookUrl?: string | null;
      socialSlackUseMessagingFallback?: boolean;
      socialSlackNotifyOutboundFailures?: boolean;
      socialSlackOutboundFailureCooldownMinutes?: number;
    },
  ) {
    return this.socialHubApplicationService.updateSettings(user, body);
  }

  @Post("settings/slack-test")
  public async slackTest(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.sendSlackTest(user);
  }
}
