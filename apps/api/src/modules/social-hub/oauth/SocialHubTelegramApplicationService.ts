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

    const webhookSecret = randomBytes(24).toString("hex");
    const webhookUrl = buildTelegramConnectionWebhookUrl(row.id);
    const setHook = await callTelegramBotApi<boolean>(token, "setWebhook", {
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message", "edited_message"],
      drop_pending_updates: false,
    });
    if (!setHook.ok) {
      throw new ValidationException(
        setHook.description ??
          "Telegram webhook kaydı başarısız; API_PUBLIC_BASE_URL erişilebilir olmalı.",
      );
    }

    const metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
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
