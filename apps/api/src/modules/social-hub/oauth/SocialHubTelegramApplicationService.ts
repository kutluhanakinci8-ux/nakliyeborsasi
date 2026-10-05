import { randomBytes } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "../../auth/TotpSecretCipher";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import {
  callTelegramBotApi,
  formatTelegramBotLabel,
  type TelegramGetMeResult,
} from "./socialHubTelegramApi";
import {
  parseSocialHubConnectionMetadata,
  serializeSocialHubConnectionMetadata,
} from "./SocialHubConnectionMetadata";
import { buildTelegramConnectionWebhookUrl } from "../socialHubIntegrationUrls";
import { SOCIAL_HUB_TELEGRAM_WEBHOOK_ALLOWED_UPDATES } from "./socialHubTelegramWebhookConfig";
import { formatTelegramApiFailureMessage } from "./socialHubTelegramFlood";

@Injectable()
export class SocialHubTelegramApplicationService {
  private readonly logger = new Logger(SocialHubTelegramApplicationService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly oauthConfig: SocialHubOAuthConfigService,
  ) {}

  public async connectBot(
    companyId: string,
    botToken: string,
  ): Promise<{ connection: CompanySocialConnectionEntity }> {
    const token = botToken.trim();
    if (!token) {
      throw new ValidationException("Bot token boş olamaz.");
    }
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (!encKey) {
      throw new ValidationException(
        "OAuth şifreleme anahtarı yapılandırılmadı (SOCIAL_OAUTH_ENCRYPTION_KEY).",
      );
    }
    const meResponse = await callTelegramBotApi<TelegramGetMeResult>(
      token,
      "getMe",
    );
    if (!meResponse.ok || !meResponse.result) {
      throw new ValidationException(
        meResponse.description ??
          "Telegram bot token geçersiz; @BotFather üzerinden kontrol edin.",
      );
    }
    const me = meResponse.result;
    if (!me.is_bot) {
      throw new ValidationException("Token bir bot hesabına ait değil.");
    }

    let row = await this.connectionRepository.findOne({
      where: { companyId, platformCode: SocialPlatformCode.Telegram },
    });
    if (!row) {
      row = await this.connectionRepository.save(
        this.connectionRepository.create({
          companyId,
          platformCode: SocialPlatformCode.Telegram,
          statusCode: SocialConnectionStatusCode.Disconnected,
        }),
      );
    }

    const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
    const webhookSecret =
      metadata.telegramWebhookSecret?.trim() || randomBytes(24).toString("hex");
    await this.registerWebhook({
      connectionId: row.id,
      botToken: token,
      webhookSecret,
      failOnError: true,
    });
    metadata.telegramWebhookSecret = webhookSecret;
    row.accessTokenCiphertext = encryptTotpSecret(token, encKey);
    row.externalAccountId = String(me.id);
    row.displayName = formatTelegramBotLabel(me);
    row.profileUrl = me.username
      ? `https://t.me/${me.username}`
      : null;
    row.statusCode = SocialConnectionStatusCode.Connected;
    row.connectedAt = new Date();
    row.tokenExpiresAt = null;
    row.lastErrorMessage = null;
    row.grantedScopes = serializeSocialHubConnectionMetadata(metadata);
    await this.connectionRepository.save(row);

    this.logger.log(
      `Telegram bot connected company=${companyId} botId=${me.id}`,
    );
    return { connection: row };
  }

  public async syncConnectedBotWebhooks(): Promise<void> {
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (!encKey) {
      return;
    }
    const rows = await this.connectionRepository.find({
      where: {
        platformCode: SocialPlatformCode.Telegram,
        statusCode: SocialConnectionStatusCode.Connected,
      },
    });
    for (const row of rows) {
      if (!row.accessTokenCiphertext) {
        continue;
      }
      const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
      const webhookSecret = metadata.telegramWebhookSecret?.trim();
      if (!webhookSecret) {
        continue;
      }
      try {
        const token = decryptTotpSecret(row.accessTokenCiphertext, encKey);
        await this.registerWebhook({
          connectionId: row.id,
          botToken: token,
          webhookSecret,
          failOnError: false,
        });
      } catch (error) {
        this.logger.warn(
          `Telegram webhook sync failed connection=${row.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  private async registerWebhook(params: {
    connectionId: string;
    botToken: string;
    webhookSecret: string;
    failOnError: boolean;
  }): Promise<void> {
    const setHook = await callTelegramBotApi<boolean>(
      params.botToken,
      "setWebhook",
      {
        url: buildTelegramConnectionWebhookUrl(params.connectionId),
        secret_token: params.webhookSecret,
        allowed_updates: SOCIAL_HUB_TELEGRAM_WEBHOOK_ALLOWED_UPDATES,
        drop_pending_updates: false,
      },
    );
    if (!setHook.ok) {
      const detail = formatTelegramApiFailureMessage(
        setHook,
        "Telegram webhook kaydı başarısız; API_PUBLIC_BASE_URL erişilebilir olmalı.",
      );
      if (params.failOnError) {
        throw new ValidationException(detail);
      }
      this.logger.warn(
        `Telegram setWebhook failed connection=${params.connectionId}: ${detail}`,
      );
      return;
    }
    this.logger.debug(
      `Telegram webhook registered connection=${params.connectionId} updates=${SOCIAL_HUB_TELEGRAM_WEBHOOK_ALLOWED_UPDATES.join(",")}`,
    );
  }

  public async disconnectBot(companyId: string): Promise<void> {
    const row = await this.connectionRepository.findOne({
      where: { companyId, platformCode: SocialPlatformCode.Telegram },
    });
    if (!row) {
      return;
    }
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (row.accessTokenCiphertext && encKey) {
      try {
        const token = decryptTotpSecret(row.accessTokenCiphertext, encKey);
        await callTelegramBotApi<boolean>(token, "deleteWebhook", {
          drop_pending_updates: false,
        });
      } catch (error) {
        this.logger.warn(
          `Telegram deleteWebhook failed company=${companyId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
