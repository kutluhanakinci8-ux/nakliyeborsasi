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
import { SocialHubOAuthStateService } from "./SocialHubOAuthStateService";
import type { SocialOAuthStartResult } from "../providers/SocialProviderPort";
import {
  assertRoadmapPlatformCode,
  isRoadmapPlatformCode,
} from "../socialHubRoadmapInterest";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_SCOPES = "user.info.basic";

@Injectable()
export class SocialHubRoadmapOAuthApplicationService {
  private readonly logger = new Logger(SocialHubRoadmapOAuthApplicationService.name);

  public constructor(
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly oauthStateService: SocialHubOAuthStateService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
  ) {}

  public async startConnect(
    companyId: string,
    platformCode: string,
  ): Promise<SocialOAuthStartResult> {
    const code = assertRoadmapPlatformCode(platformCode);
    if (code === "TIKTOK") {
      return this.startTikTok(companyId, code);
    }
    return {
      implementationStatus: "pending",
      authorizationUrl: null,
      state: null,
      message: `${code} OAuth entegrasyonu henüz açılmadı (TikTok sonrası).`,
    };
  }

  public async completeExchange(
    companyId: string,
    platformCode: string,
    authorizationCode: string,
  ): Promise<void> {
    if (!isRoadmapPlatformCode(platformCode)) {
      throw new ValidationException("Geçersiz yol haritası platformu.");
    }
    const code = assertRoadmapPlatformCode(platformCode);
    if (code === "TIKTOK") {
      await this.exchangeTikTok(companyId, code, authorizationCode);
      return;
    }
    throw new ValidationException(`${code} OAuth henüz desteklenmiyor.`);
  }

  private async startTikTok(
    companyId: string,
    platformCode: string,
  ): Promise<SocialOAuthStartResult> {
    const config = this.oauthConfig.getTikTokConfig();
    if (!config) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "TikTok OAuth yapılandırılmadı (SOCIAL_TIKTOK_OAUTH_CLIENT_ID / SECRET / redirect).",
      };
    }
    await this.ensureConnectionRow(companyId, platformCode);
    const state = await this.oauthStateService.issueState(companyId, platformCode);
    const url = new URL(TIKTOK_AUTH_URL);
    url.searchParams.set("client_key", config.clientKey);
    url.searchParams.set("scope", TIKTOK_SCOPES);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("state", state);
    return {
      implementationStatus: "ready",
      authorizationUrl: url.toString(),
      state,
      message: "TikTok OAuth (beta) yönlendirmesi hazır.",
    };
  }

  private async exchangeTikTok(
    companyId: string,
    platformCode: string,
    authorizationCode: string,
  ): Promise<void> {
    const config = this.oauthConfig.getTikTokConfig();
    if (!config) {
      throw new ValidationException("TikTok OAuth yapılandırması eksik.");
    }
    const body = new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    });
    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      open_id?: string;
      error_description?: string;
      message?: string;
    };
    if (!response.ok || !payload.access_token) {
      const detail =
        payload.error_description ??
        payload.message ??
        "TikTok token alınamadı.";
      this.logger.warn(`TikTok token exchange failed: ${detail}`);
      throw new ValidationException(detail);
    }
    await this.persistConnection(companyId, platformCode, {
      accessToken: payload.access_token,
      expiresInSec: payload.expires_in ?? null,
      externalAccountId: payload.open_id ?? null,
      displayName: "TikTok (beta)",
    });
  }

  private async persistConnection(
    companyId: string,
    platformCode: string,
    tokens: {
      accessToken: string;
      expiresInSec: number | null;
      externalAccountId: string | null;
      displayName: string;
    },
  ): Promise<void> {
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (!encKey) {
      throw new ValidationException("SOCIAL_OAUTH_ENCRYPTION_KEY tanımlı değil.");
    }
    const row = await this.ensureConnectionRow(companyId, platformCode);
    row.statusCode = SocialConnectionStatusCode.Connected;
    row.connectedAt = new Date();
    row.lastErrorMessage = null;
    row.displayName = tokens.displayName;
    row.externalAccountId = tokens.externalAccountId;
    row.accessTokenCiphertext = encryptTotpSecret(tokens.accessToken, encKey);
    row.tokenExpiresAt = tokens.expiresInSec
      ? new Date(Date.now() + tokens.expiresInSec * 1000)
      : null;
    await this.connectionRepository.save(row);
  }

  private async ensureConnectionRow(
    companyId: string,
    platformCode: string,
  ): Promise<CompanySocialConnectionEntity> {
    const found = await this.connectionRepository.findOne({
      where: { companyId, platformCode },
    });
    if (found) {
      return found;
    }
    return this.connectionRepository.save(
      this.connectionRepository.create({
        companyId,
        platformCode,
        statusCode: SocialConnectionStatusCode.Disconnected,
        externalAccountId: null,
        displayName: null,
        profileUrl: null,
        lastErrorMessage: null,
        grantedScopes: null,
        connectedAt: null,
        tokenExpiresAt: null,
        accessTokenCiphertext: null,
      }),
    );
  }
}
