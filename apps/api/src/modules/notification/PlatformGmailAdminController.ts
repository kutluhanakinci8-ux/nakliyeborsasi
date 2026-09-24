import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { randomBytes } from "node:crypto";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { JwtAuthenticationGuard } from "../auth/JwtAuthenticationGuard";
import { AuthenticatedUserParam } from "../auth/AuthenticatedUserParam";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { PlatformAdminGuard } from "../platform-admin/PlatformAdminGuard";
import { PlatformGmailOAuthStateEntity } from "../../infrastructure/database/entities/PlatformGmailOAuthStateEntity";
import { GmailInboxService } from "./GmailInboxService";
import { GmailOAuthConfigurationService } from "./GmailOAuthConfigurationService";
import { EmailEspWebhookService } from "./EmailEspWebhookService";

@Controller("platform-admin/gmail")
export class PlatformGmailAdminController {
  public constructor(
    private readonly gmailInboxService: GmailInboxService,
    private readonly gmailOAuthConfigurationService: GmailOAuthConfigurationService,
    private readonly emailEspWebhookService: EmailEspWebhookService,
    @InjectRepository(PlatformGmailOAuthStateEntity)
    private readonly oauthStateRepository: Repository<PlatformGmailOAuthStateEntity>,
  ) {}

  @Get("status")
  @UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
  public async status() {
    return {
      status: await this.gmailInboxService.getConnectionStatus(),
      redirectUri: this.gmailOAuthConfigurationService.resolveRedirectUri(),
    };
  }

  @Post("connect/start")
  @UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
  public async connectStart(
    @AuthenticatedUserParam() user: AuthenticatedUserContext,
  ) {
    if (!this.gmailOAuthConfigurationService.isConfigured()) {
      return {
        ok: false,
        error:
          "GOOGLE_GMAIL_CLIENT_ID ve GOOGLE_GMAIL_CLIENT_SECRET tanımlı değil",
      };
    }
    await this.oauthStateRepository.delete({
      createdAt: LessThan(new Date(Date.now() - 15 * 60 * 1000)),
    });
    const state = randomBytes(24).toString("hex");
    await this.oauthStateRepository.save(
      this.oauthStateRepository.create({
        state,
        operatorUserId: user.userId,
      }),
    );
    const oauth2 = this.gmailInboxService.createOAuthClient();
    const authUrl = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: this.gmailInboxService.getRequiredScopes(),
      state,
    });
    return { ok: true, authUrl };
  }

  @Get("oauth/callback")
  public async oauthCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const returnBase =
      this.gmailOAuthConfigurationService.resolveWebAdminReturnUrl();
    if (error || !code || !state) {
      res.redirect(`${returnBase}?gmail=error`);
      return;
    }
    const stateRow = await this.oauthStateRepository.findOne({
      where: { state },
    });
    if (!stateRow) {
      res.redirect(`${returnBase}?gmail=invalid_state`);
      return;
    }
    await this.oauthStateRepository.delete({ state });
    try {
      await this.gmailInboxService.saveTokensFromOAuthCode(code);
      res.redirect(`${returnBase}?gmail=connected`);
    } catch {
      res.redirect(`${returnBase}?gmail=token_error`);
    }
  }

  @Get("messages")
  @UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
  public async messages(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 40;
    const max = Number.isFinite(parsed) ? Math.min(parsed, 80) : 40;
    const messages = await this.gmailInboxService.listInboxMessages(max);
    return { messages };
  }

  @Post("sync-bounces")
  @UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
  public async syncBounces(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 60;
    const max = Number.isFinite(parsed) ? Math.min(parsed, 100) : 60;
    const messages = await this.gmailInboxService.listInboxMessages(max);
    const added = await this.emailEspWebhookService.syncGmailBounceCandidates(
      messages.map((row) => ({
        from: row.from,
        subject: row.subject,
        snippet: row.snippet,
      })),
    );
    return { ok: true, scanned: messages.length, suppressionsAdded: added };
  }

  @Delete("connection")
  @UseGuards(JwtAuthenticationGuard, PlatformAdminGuard)
  public async disconnect() {
    await this.gmailInboxService.disconnect();
    return { ok: true };
  }
}
