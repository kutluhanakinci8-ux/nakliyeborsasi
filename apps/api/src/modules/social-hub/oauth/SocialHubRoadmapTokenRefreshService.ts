import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  SocialConnectionStatusCode,
  ValidationException,
} from "@nakliyeborsasi/core";
import { encryptTotpSecret } from "../../auth/TotpSecretCipher";
import { CompanySocialConnectionEntity } from "../../../infrastructure/database/entities/CompanySocialConnectionEntity";
import { SocialHubOAuthConfigService } from "./SocialHubOAuthConfigService";
import { assertRoadmapPlatformCode } from "../socialHubRoadmapInterest";
import {
  hasRoadmapRefreshToken,
  mergeRoadmapRefreshToken,
  readRoadmapRefreshToken,
} from "./socialHubRoadmapRefreshToken";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

@Injectable()
export class SocialHubRoadmapTokenRefreshService {
  private readonly logger = new Logger(SocialHubRoadmapTokenRefreshService.name);

  public constructor(
    private readonly oauthConfig: SocialHubOAuthConfigService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
  ) {}

  public async refreshRoadmapToken(
    companyId: string,
    platformCode: string,
  ): Promise<{ refreshed: boolean; message: string }> {
    const code = assertRoadmapPlatformCode(platformCode);
    const row = await this.connectionRepository.findOne({
      where: { companyId, platformCode: code },
    });
    if (!row || row.statusCode !== SocialConnectionStatusCode.Connected) {
      return { refreshed: false, message: "Bağlı yol haritası hesabı bulunamadı." };
    }
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (!encKey) {
      throw new ValidationException("SOCIAL_OAUTH_ENCRYPTION_KEY tanımlı değil.");
    }
    const refreshToken = readRoadmapRefreshToken(row.grantedScopes, encKey);
    if (!refreshToken) {
      return {
        refreshed: false,
        message: "Refresh token yok — hesabı yeniden bağlayın.",
      };
    }
    if (code === "TIKTOK") {
      return this.refreshTikTok(row, refreshToken, encKey);
    }
    if (code === "YOUTUBE") {
      return this.refreshYouTube(row, refreshToken, encKey);
    }
    return { refreshed: false, message: "Bu kanal için yenileme desteklenmiyor." };
  }

  private async refreshTikTok(
    row: CompanySocialConnectionEntity,
    refreshToken: string,
    encKey: string,
  ): Promise<{ refreshed: boolean; message: string }> {
    const config = this.oauthConfig.getTikTokConfig();
    if (!config) {
      return { refreshed: false, message: "TikTok OAuth yapılandırması eksik." };
    }
    const body = new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error_description?: string;
      message?: string;
    };
    if (!response.ok || !payload.access_token) {
      const detail =
        payload.error_description ?? payload.message ?? "TikTok yenileme başarısız.";
      this.logger.warn(detail);
      return { refreshed: false, message: detail };
    }
    row.accessTokenCiphertext = encryptTotpSecret(payload.access_token, encKey);
    row.tokenExpiresAt = payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : row.tokenExpiresAt;
    if (payload.refresh_token) {
      row.grantedScopes = mergeRoadmapRefreshToken(
        row.grantedScopes,
        payload.refresh_token,
        encKey,
      );
    }
    row.lastErrorMessage = null;
    await this.connectionRepository.save(row);
    return { refreshed: true, message: "TikTok erişim tokenı yenilendi." };
  }

  private async refreshYouTube(
    row: CompanySocialConnectionEntity,
    refreshToken: string,
    encKey: string,
  ): Promise<{ refreshed: boolean; message: string }> {
    const config = this.oauthConfig.getYouTubeConfig();
    if (!config) {
      return { refreshed: false, message: "YouTube OAuth yapılandırması eksik." };
    }
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!response.ok || !payload.access_token) {
      const detail = payload.error_description ?? "YouTube yenileme başarısız.";
      this.logger.warn(detail);
      return { refreshed: false, message: detail };
    }
    row.accessTokenCiphertext = encryptTotpSecret(payload.access_token, encKey);
    row.tokenExpiresAt = payload.expires_in
      ? new Date(Date.now() + payload.expires_in * 1000)
      : row.tokenExpiresAt;
    row.lastErrorMessage = null;
    await this.connectionRepository.save(row);
    return { refreshed: true, message: "YouTube erişim tokenı yenilendi." };
  }

  public connectionHasRefreshToken(row: CompanySocialConnectionEntity): boolean {
    return hasRoadmapRefreshToken(row.grantedScopes);
  }
}
