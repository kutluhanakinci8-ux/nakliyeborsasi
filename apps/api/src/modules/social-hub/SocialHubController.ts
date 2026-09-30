import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
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
    },
  ) {
    return this.socialHubApplicationService.updateSettings(user, body);
  }
}
