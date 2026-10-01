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

  @Get("inbox/sync-summary")
  public async inboxSyncSummary(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return this.socialHubApplicationService.getInboxSyncSummary(user);
  }

  @Get("inbox/threads-preview")
  public async inboxThreadsPreview(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("limit") limit?: string,
  ) {
    const parsed =
      limit !== undefined && limit !== ""
        ? Number.parseInt(limit, 10)
        : undefined;
    return this.socialHubApplicationService.getInboxThreadsPreview(
      user,
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }

  @Post("connections/:platformCode/sync-inbox")
  public async syncInbox(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.syncInbox(user, platformCode);
  }

  @Post("publishing/media")
  public async uploadPublishMedia(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Body()
    body: {
      filename: string;
      contentType: string;
      contentBase64: string;
    },
  ) {
    return this.socialHubApplicationService.uploadPublishMedia(user, body);
  }

  @Get("publishing/media/:mediaId")
  public async readPublishMedia(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("mediaId") mediaId: string,
    @Res() response: Response,
  ) {
    const file = await this.socialHubApplicationService.readPublishMedia(
      user,
      mediaId,
    );
    response.setHeader("Content-Type", file.contentType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${file.filename.replace(/"/g, "")}"`,
    );
    response.send(file.buffer);
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

  @Get("health/webhook-activity/export")
  public async exportWebhookActivity(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const csv =
      await this.socialHubApplicationService.exportWebhookActivityCsv(user);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="social-hub-webhook-activity.csv"',
    );
    response.send(csv);
  }

  @Get("health/insights/export")
  public async exportHealthInsights(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const csv =
      await this.socialHubApplicationService.exportNotificationInsightsCsv(user);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="social-hub-insights.csv"',
    );
    response.send(csv);
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

  @Get("analytics/export")
  public async exportAnalytics(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Res() response: Response,
  ): Promise<void> {
    const csv = await this.socialHubApplicationService.exportAnalyticsCsv(user);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="social-hub-analytics.csv"',
    );
    response.send(csv);
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
  public async listAuditLog(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Query("focus") focus?: string,
  ) {
    return this.socialHubApplicationService.listAuditLog(user, focus);
  }

  @Get("audit-log/export")
  public async exportAuditLog(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Res() response: Response,
    @Query("focus") focus?: string,
  ): Promise<void> {
    const csv = await this.socialHubApplicationService.exportAuditLogCsv(
      user,
      focus,
    );
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="social-hub-audit-log.csv"',
    );
    response.send(csv);
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
      socialSlackDailyDigestEnabled?: boolean;
      healthAlertSlackCooldownMinutes?: number;
      socialSlackDigestBusinessHoursOnly?: boolean;
      socialSlackDigestTimezone?: string;
      socialSlackDigestHourStart?: number;
      socialSlackDigestHourEnd?: number;
      socialHubWeeklyEmailEnabled?: boolean;
    },
  ) {
    return this.socialHubApplicationService.updateSettings(user, body);
  }

  @Post("settings/slack-test")
  public async slackTest(@AuthenticatedUserParam() user: AuthenticatedUserContext) {
    return this.socialHubApplicationService.sendSlackTest(user);
  }

  @Post("settings/slack-digest-now")
  public async slackDigestNow(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return this.socialHubApplicationService.sendSlackDigestNow(user);
  }

  @Post("settings/weekly-email-now")
  public async weeklyEmailNow(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    return this.socialHubApplicationService.sendWeeklyEmailNow(user);
  }

  @Post("roadmap/:platformCode/connect")
  public async roadmapConnect(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.startRoadmapConnect(
      user,
      platformCode,
    );
  }

  @Post("roadmap/:platformCode/refresh-token")
  public async roadmapRefreshToken(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.refreshRoadmapToken(
      user,
      platformCode,
    );
  }

  @Post("roadmap/:platformCode/disconnect")
  public async roadmapDisconnect(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
  ) {
    return this.socialHubApplicationService.disconnectRoadmapPlatform(
      user,
      platformCode,
    );
  }

  @Post("roadmap/:platformCode/interest")
  public async setRoadmapInterest(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
    @Param("platformCode") platformCode: string,
    @Body() body: { interested: boolean },
  ) {
    return this.socialHubApplicationService.setRoadmapInterest(
      user,
      platformCode,
      body.interested === true,
    );
  }
}
