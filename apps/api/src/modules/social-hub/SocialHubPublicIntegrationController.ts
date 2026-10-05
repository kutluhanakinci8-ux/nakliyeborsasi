import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { SocialHubOAuthApplicationService } from "./oauth/SocialHubOAuthApplicationService";
import { SocialHubOAuthConfigService } from "./oauth/SocialHubOAuthConfigService";
import { SocialHubWebhookIngestService } from "./oauth/SocialHubWebhookIngestService";
import { SocialHubTikTokWebhookIngestService } from "./oauth/SocialHubTikTokWebhookIngestService";
import { SocialHubYouTubeWebhookIngestService } from "./oauth/SocialHubYouTubeWebhookIngestService";
import { SocialHubXWebhookIngestService } from "./oauth/SocialHubXWebhookIngestService";
import { SocialHubTelegramWebhookIngestService } from "./oauth/SocialHubTelegramWebhookIngestService";
import { buildXWebhookCrcResponse } from "./oauth/socialHubXWebhookCrc";

@Controller("company/social-hub")
export class SocialHubPublicIntegrationController {
  public constructor(
    private readonly socialHubOAuthApplicationService: SocialHubOAuthApplicationService,
    private readonly socialHubOAuthConfigService: SocialHubOAuthConfigService,
    private readonly socialHubWebhookIngestService: SocialHubWebhookIngestService,
    private readonly socialHubTikTokWebhookIngestService: SocialHubTikTokWebhookIngestService,
    private readonly socialHubYouTubeWebhookIngestService: SocialHubYouTubeWebhookIngestService,
    private readonly socialHubXWebhookIngestService: SocialHubXWebhookIngestService,
    private readonly socialHubTelegramWebhookIngestService: SocialHubTelegramWebhookIngestService,
  ) {}

  @Get("oauth/callback")
  public async oauthCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") error: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.socialHubOAuthApplicationService.completeCallback({
      code: code ?? null,
      state: state ?? null,
      error: error ?? null,
    });
    response.redirect(302, result.redirectUrl);
  }

  @Get("webhooks/meta")
  public metaWebhookVerify(
    @Query("hub.mode") mode: string | undefined,
    @Query("hub.verify_token") verifyToken: string | undefined,
    @Query("hub.challenge") challenge: string | undefined,
    @Res() response: Response,
  ): void {
    const config = this.socialHubOAuthConfigService.getMetaConfig();
    const expected = config?.webhookVerifyToken ?? "";
    if (
      mode === "subscribe" &&
      verifyToken &&
      expected &&
      verifyToken === expected &&
      challenge
    ) {
      response.status(200).send(challenge);
      return;
    }
    response.status(403).send("Forbidden");
  }

  @Post("webhooks/meta")
  @HttpCode(200)
  public async metaWebhook(
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
    await this.socialHubWebhookIngestService.ingestMetaPayload(
      request.headers["x-hub-signature-256"] as string | undefined,
      body,
      rawBody,
    );
    return { received: true };
  }

  @Get("webhooks/whatsapp")
  public whatsappWebhookVerify(
    @Query("hub.mode") mode: string | undefined,
    @Query("hub.verify_token") verifyToken: string | undefined,
    @Query("hub.challenge") challenge: string | undefined,
    @Res() response: Response,
  ): void {
    this.metaWebhookVerify(mode, verifyToken, challenge, response);
  }

  @Post("webhooks/tiktok")
  @HttpCode(200)
  public async tiktokWebhook(
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
    const signature =
      (request.headers["x-tiktok-signature"] as string | undefined) ??
      (request.headers["tiktok-signature"] as string | undefined);
    await this.socialHubTikTokWebhookIngestService.ingestPayload(body, {
      signatureHeader: signature,
      rawBody,
    });
    return { received: true };
  }

  @Get("webhooks/x")
  public xWebhookCrc(
    @Query("crc_token") crcToken: string | undefined,
    @Res() response: Response,
  ): void {
    const secret = this.socialHubXWebhookIngestService.resolveWebhookConsumerSecret();
    if (!crcToken?.trim() || !secret) {
      response.status(403).send("Forbidden");
      return;
    }
    response.status(200).json({
      response_token: buildXWebhookCrcResponse(crcToken.trim(), secret),
    });
  }

  @Post("webhooks/x")
  @HttpCode(200)
  public async xWebhook(
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    await this.socialHubXWebhookIngestService.ingestPayload(body);
    return { received: true };
  }

  @Post("webhooks/youtube")
  @HttpCode(200)
  public async youtubeWebhook(
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const channelToken =
      (request.headers["x-goog-channel-token"] as string | undefined) ??
      (request.headers["x-social-hub-youtube-token"] as string | undefined);
    await this.socialHubYouTubeWebhookIngestService.ingestPayload(body, {
      channelTokenHeader: channelToken,
      authorizationHeader: request.headers.authorization,
    });
    return { received: true };
  }

  @Post("webhooks/telegram/connection/:connectionId")
  @HttpCode(200)
  public async telegramWebhook(
    @Param("connectionId") connectionId: string,
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    await this.socialHubTelegramWebhookIngestService.ingestPayload({
      connectionId,
      secretTokenHeader: request.headers[
        "x-telegram-bot-api-secret-token"
      ] as string | undefined,
      body,
    });
    return { received: true };
  }

  @Post("webhooks/whatsapp")
  @HttpCode(200)
  public async whatsappWebhook(
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const rawBody = (request as Request & { rawBody?: Buffer }).rawBody;
    await this.socialHubWebhookIngestService.ingestWhatsAppPayload(
      request.headers["x-hub-signature-256"] as string | undefined,
      body,
      rawBody,
    );
    return { received: true };
  }
}
