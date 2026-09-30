import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  SocialPlatformCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { encryptTotpSecret } from "../../auth/TotpSecretCipher";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import { SocialHubTokenVaultService } from "./SocialHubTokenVaultService";

@Injectable()
export class SocialHubTokenRefreshService {
  private readonly logger = new Logger(SocialHubTokenRefreshService.name);

  public constructor(
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly tokenVault: SocialHubTokenVaultService,
  ) {}

  public async refreshConnectionToken(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<{ refreshed: boolean; message: string; tokenExpiresAt: string | null }> {
    const row = await this.connectionRepository.findOne({
      where: { companyId, platformCode },
    });
    if (!row || row.statusCode !== SocialConnectionStatusCode.Connected) {
      throw new ValidationException("Bağlı kanal bulunamadı.");
    }
    if (platformCode === SocialPlatformCode.LinkedIn) {
      return {
        refreshed: false,
        message: "LinkedIn token yenileme desteklenmiyor; yeniden bağlanın.",
        tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
      };
    }
    const current = await this.tokenVault.getAccessToken(companyId, platformCode);
    if (!current) {
      row.statusCode = SocialConnectionStatusCode.TokenExpired;
      row.lastErrorMessage = "Token yok; OAuth ile yeniden bağlanın.";
      await this.connectionRepository.save(row);
      throw new ValidationException(row.lastErrorMessage);
    }
    const config = this.oauthConfig.getMetaConfig();
    if (!config) {
      throw new ValidationException("Meta OAuth yapılandırması eksik.");
    }
    const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("client_secret", config.appSecret);
    url.searchParams.set("fb_exchange_token", current);
    const response = await fetch(url.toString());
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };
    if (!response.ok || !payload.access_token) {
      const message =
        payload.error?.message ?? "Meta token yenileme başarısız.";
      row.statusCode = SocialConnectionStatusCode.Error;
      row.lastErrorMessage = message;
      await this.connectionRepository.save(row);
      return {
        refreshed: false,
        message,
        tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
      };
    }
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (!encKey) {
      throw new ValidationException("SOCIAL_OAUTH_ENCRYPTION_KEY tanımlı değil.");
    }
    row.accessTokenCiphertext = encryptTotpSecret(payload.access_token, encKey);
    row.tokenExpiresAt = payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : null;
    row.statusCode = SocialConnectionStatusCode.Connected;
    row.lastErrorMessage = null;
    await this.connectionRepository.save(row);
    this.logger.log(
      `Refreshed Meta token company=${companyId} platform=${platformCode}`,
    );
    return {
      refreshed: true,
      message: "Erişim tokenı yenilendi.",
      tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    };
  }

  public async refreshExpiringConnections(): Promise<number> {
    const horizon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const rows = await this.connectionRepository
      .createQueryBuilder("connection")
      .where("connection.statusCode = :status", {
        status: SocialConnectionStatusCode.Connected,
      })
      .andWhere("connection.tokenExpiresAt IS NOT NULL")
      .andWhere("connection.tokenExpiresAt <= :horizon", { horizon })
      .take(25)
      .getMany();
    let refreshed = 0;
    for (const row of rows) {
      const platform = row.platformCode as SocialPlatformCode;
      if (platform === SocialPlatformCode.LinkedIn) {
        continue;
      }
      try {
        const result = await this.refreshConnectionToken(row.companyId, platform);
        if (result.refreshed) {
          refreshed += 1;
        }
      } catch (error) {
        this.logger.warn(
          `Auto token refresh failed company=${row.companyId} platform=${platform}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return refreshed;
  }
}
