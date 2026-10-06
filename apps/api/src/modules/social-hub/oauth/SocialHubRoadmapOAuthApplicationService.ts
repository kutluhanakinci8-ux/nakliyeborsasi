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
import type {
  SocialOAuthConnectContext,
  SocialOAuthStartResult,
} from "../providers/SocialProviderPort";
import {
  assertRoadmapPlatformCode,
  isRoadmapPlatformCode,
} from "../socialHubRoadmapInterest";
import { isRoadmapPendingSkeletonPlatform } from "../socialHubRoadmapPendingProviders";
import { mergeRoadmapRefreshToken } from "./socialHubRoadmapRefreshToken";
import {
  generatePkceVerifier,
  pkceChallengeS256,
} from "./socialHubOAuthPkce";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_SCOPES = "user.info.basic";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_SCOPES =
  "https://www.googleapis.com/auth/youtube.readonly openid email profile";
const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USERS_ME_URL = "https://api.twitter.com/2/users/me";

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
    context?: SocialOAuthConnectContext,
  ): Promise<SocialOAuthStartResult> {
    const webReturnQuery = this.oauthConfig.sanitizeWebReturnQuery(
      context?.webReturnQuery,
    );
    const code = assertRoadmapPlatformCode(platformCode);
    if (isRoadmapPendingSkeletonPlatform(code)) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "Bu kanal pending provider iskeletinde — OAuth henüz açılmadı. Öncelik bildirimi ile sıraya alın.",
      };
    }
    if (code === "TIKTOK") {
      return this.startTikTok(companyId, code, webReturnQuery);
    }
    if (code === "YOUTUBE") {
      return this.startYouTube(companyId, code, webReturnQuery);
    }
    if (code === "X") {
      return this.startX(companyId, code, webReturnQuery);
    }
    return {
      implementationStatus: "pending",
      authorizationUrl: null,
      state: null,
      message: `${code} OAuth entegrasyonu henüz açılmadı.`,
    };
  }

  public async completeExchange(
    companyId: string,
    platformCode: string,
    authorizationCode: string,
    options?: { codeVerifier?: string | null },
  ): Promise<void> {
    if (!isRoadmapPlatformCode(platformCode)) {
      throw new ValidationException("Geçersiz yol haritası platformu.");
    }
    const code = assertRoadmapPlatformCode(platformCode);
    if (code === "TIKTOK") {
      await this.exchangeTikTok(companyId, code, authorizationCode);
      return;
    }
    if (code === "YOUTUBE") {
      await this.exchangeYouTube(companyId, code, authorizationCode);
      return;
    }
    if (code === "X") {
      await this.exchangeX(companyId, code, authorizationCode, options?.codeVerifier);
      return;
    }
    throw new ValidationException(`${code} OAuth henüz desteklenmiyor.`);
  }

  private async startTikTok(
    companyId: string,
    platformCode: string,
    webReturnQuery: string | null,
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
    const state = await this.oauthStateService.issueState(companyId, platformCode, {
      webReturnQuery,
    });
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
      message: "TikTok OAuth yönlendirmesi hazır.",
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
      refresh_token?: string;
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
      displayName: "TikTok",
      refreshToken: payload.refresh_token ?? null,
    });
  }

  private async startX(
    companyId: string,
    platformCode: string,
    webReturnQuery: string | null,
  ): Promise<SocialOAuthStartResult> {
    const config = this.oauthConfig.getXConfig();
    if (!config) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "X OAuth yapılandırılmadı (SOCIAL_X_OAUTH_CLIENT_ID / SECRET / redirect).",
      };
    }
    await this.ensureConnectionRow(companyId, platformCode);
    const pkceVerifier = generatePkceVerifier();
    const state = await this.oauthStateService.issueState(companyId, platformCode, {
      pkceVerifier,
      webReturnQuery,
    });
    const url = new URL(X_AUTH_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("scope", config.scopes);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", pkceChallengeS256(pkceVerifier));
    url.searchParams.set("code_challenge_method", "S256");
    return {
      implementationStatus: "ready",
      authorizationUrl: url.toString(),
      state,
      message: "X OAuth yönlendirmesi hazır (@lertalogistics ile giriş yapın).",
    };
  }

  private async exchangeX(
    companyId: string,
    platformCode: string,
    authorizationCode: string,
    codeVerifier: string | null | undefined,
  ): Promise<void> {
    const config = this.oauthConfig.getXConfig();
    if (!config) {
      throw new ValidationException("X OAuth yapılandırması eksik.");
    }
    if (!codeVerifier?.trim()) {
      throw new ValidationException(
        "X OAuth PKCE doğrulaması eksik — bağlantıyı yeniden başlatın.",
      );
    }
    const body = new URLSearchParams({
      code: authorizationCode,
      grant_type: "authorization_code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier.trim(),
    });
    const basic = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");
    const response = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body,
    });
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error_description?: string;
      error?: string;
    };
    if (!response.ok || !payload.access_token) {
      const detail =
        payload.error_description ??
        payload.error ??
        "X token alınamadı.";
      this.logger.warn(`X token exchange failed: ${detail}`);
      throw new ValidationException(detail);
    }
    let displayName = "X";
    let externalAccountId: string | null = null;
    let profileUrl: string | null = null;
    try {
      const userRes = await fetch(
        `${X_USERS_ME_URL}?user.fields=username,name`,
        { headers: { Authorization: `Bearer ${payload.access_token}` } },
      );
      const userPayload = (await userRes.json()) as {
        data?: { id?: string; username?: string; name?: string };
      };
      const user = userPayload.data;
      if (user?.username) {
        displayName = `@${user.username}`;
        profileUrl = `https://x.com/${user.username}`;
      } else if (user?.name) {
        displayName = user.name;
      }
      externalAccountId = user?.id ?? null;
    } catch {
      // user lookup optional
    }
    await this.persistConnection(companyId, platformCode, {
      accessToken: payload.access_token,
      expiresInSec: payload.expires_in ?? null,
      externalAccountId,
      displayName,
      refreshToken: payload.refresh_token ?? null,
      profileUrl,
    });
  }

  private async startYouTube(
    companyId: string,
    platformCode: string,
    webReturnQuery: string | null,
  ): Promise<SocialOAuthStartResult> {
    const config = this.oauthConfig.getYouTubeConfig();
    if (!config) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "YouTube OAuth yapılandırılmadı (SOCIAL_YOUTUBE_OAUTH_CLIENT_ID / SECRET / redirect).",
      };
    }
    await this.ensureConnectionRow(companyId, platformCode);
    const state = await this.oauthStateService.issueState(companyId, platformCode, {
      webReturnQuery,
    });
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", YOUTUBE_SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    return {
      implementationStatus: "ready",
      authorizationUrl: url.toString(),
      state,
      message: "YouTube OAuth yönlendirmesi hazır.",
    };
  }

  private async exchangeYouTube(
    companyId: string,
    platformCode: string,
    authorizationCode: string,
  ): Promise<void> {
    const config = this.oauthConfig.getYouTubeConfig();
    if (!config) {
      throw new ValidationException("YouTube OAuth yapılandırması eksik.");
    }
    const body = new URLSearchParams({
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error_description?: string;
    };
    if (!response.ok || !payload.access_token) {
      throw new ValidationException(
        payload.error_description ?? "YouTube token alınamadı.",
      );
    }
    let channelTitle = "YouTube";
    let channelId: string | null = null;
    try {
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${payload.access_token}` } },
      );
      const channelPayload = (await channelRes.json()) as {
        items?: Array<{ id?: string; snippet?: { title?: string } }>;
      };
      const item = channelPayload.items?.[0];
      if (item?.snippet?.title) {
        channelTitle = item.snippet.title;
      }
      channelId = item?.id ?? null;
    } catch {
      // channel lookup optional
    }
    await this.persistConnection(companyId, platformCode, {
      accessToken: payload.access_token,
      expiresInSec: payload.expires_in ?? null,
      externalAccountId: channelId,
      displayName: channelTitle,
      refreshToken: payload.refresh_token ?? null,
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
      refreshToken?: string | null;
      profileUrl?: string | null;
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
    if (tokens.profileUrl !== undefined) {
      row.profileUrl = tokens.profileUrl;
    }
    row.accessTokenCiphertext = encryptTotpSecret(tokens.accessToken, encKey);
    row.tokenExpiresAt = tokens.expiresInSec
      ? new Date(Date.now() + tokens.expiresInSec * 1000)
      : null;
    if (tokens.refreshToken) {
      row.grantedScopes = mergeRoadmapRefreshToken(
        row.grantedScopes,
        tokens.refreshToken,
        encKey,
      );
    }
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
