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
import { SocialHubOAuthStateService } from "./SocialHubOAuthStateService";
import { SocialHubMetaGraphService } from "./SocialHubMetaGraphService";
import { SocialHubLinkedInGraphService } from "./SocialHubLinkedInGraphService";
import { mergeLinkedInRefreshToken } from "./socialHubLinkedInRefreshToken";
import {
  parseSocialHubConnectionMetadata,
  serializeSocialHubConnectionMetadata,
} from "./SocialHubConnectionMetadata";
import type { SocialOAuthStartResult } from "../providers/SocialProviderPort";
import { SocialHubRoadmapOAuthApplicationService } from "./SocialHubRoadmapOAuthApplicationService";
import { isRoadmapPlatformCode } from "../socialHubRoadmapInterest";

const META_SCOPES: Record<string, string> = {
  [SocialPlatformCode.Instagram]:
    "instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging",
  [SocialPlatformCode.FacebookMessenger]:
    "pages_messaging,pages_show_list,pages_read_engagement",
  [SocialPlatformCode.WhatsAppCloud]:
    "whatsapp_business_management,whatsapp_business_messaging,business_management",
};

@Injectable()
export class SocialHubOAuthApplicationService {
  private readonly logger = new Logger(SocialHubOAuthApplicationService.name);

  public constructor(
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly oauthStateService: SocialHubOAuthStateService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly metaGraphService: SocialHubMetaGraphService,
    private readonly linkedInGraphService: SocialHubLinkedInGraphService,
    private readonly roadmapOAuthApplicationService: SocialHubRoadmapOAuthApplicationService,
  ) {}

  public async startOAuth(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<SocialOAuthStartResult> {
    if (platformCode === SocialPlatformCode.LinkedIn) {
      return this.startLinkedIn(companyId);
    }
    if (
      platformCode === SocialPlatformCode.Instagram ||
      platformCode === SocialPlatformCode.FacebookMessenger ||
      platformCode === SocialPlatformCode.WhatsAppCloud
    ) {
      return this.startMeta(companyId, platformCode);
    }
    return {
      implementationStatus: "pending",
      authorizationUrl: null,
      state: null,
      message: "Bilinmeyen platform.",
    };
  }

  public async completeCallback(params: {
    code: string | null;
    state: string | null;
    error: string | null;
  }): Promise<{ redirectUrl: string }> {
    const returnBase = this.oauthConfig.getWebAppReturnUrl();
    if (params.error) {
      return {
        redirectUrl: `${returnBase}&oauth=error&reason=${encodeURIComponent(params.error)}`,
      };
    }
    if (!params.code || !params.state) {
      return {
        redirectUrl: `${returnBase}&oauth=error&reason=missing_code`,
      };
    }
    const stateRow = await this.oauthStateService.consumeState(params.state);
    const platform = stateRow.platformCode;
    try {
      if (isRoadmapPlatformCode(platform)) {
        await this.roadmapOAuthApplicationService.completeExchange(
          stateRow.companyId,
          platform,
          params.code,
        );
      } else if (platform === SocialPlatformCode.LinkedIn) {
        await this.exchangeLinkedIn(
          stateRow.companyId,
          platform as SocialPlatformCode,
          params.code,
        );
      } else {
        await this.exchangeMeta(
          stateRow.companyId,
          platform as SocialPlatformCode,
          params.code,
        );
      }
      return { redirectUrl: `${returnBase}&oauth=success&platform=${platform}` };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "oauth_exchange_failed";
      this.logger.warn(`OAuth callback failed: ${message}`);
      return {
        redirectUrl: `${returnBase}&oauth=error&reason=${encodeURIComponent(message)}`,
      };
    }
  }

  private async startMeta(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<SocialOAuthStartResult> {
    const config = this.oauthConfig.getMetaConfig();
    if (!config) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "Meta OAuth yapılandırılmadı (SOCIAL_META_APP_ID, SOCIAL_META_APP_SECRET, redirect URI).",
      };
    }
    const state = await this.oauthStateService.issueState(companyId, platformCode);
    const scope = META_SCOPES[platformCode] ?? "pages_show_list";
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", scope);
    url.searchParams.set("response_type", "code");
    return {
      implementationStatus: "ready",
      authorizationUrl: url.toString(),
      state,
      message: "Meta OAuth yönlendirmesi hazır.",
    };
  }

  private async startLinkedIn(companyId: string): Promise<SocialOAuthStartResult> {
    const config = this.oauthConfig.getLinkedInConfig();
    if (!config) {
      return {
        implementationStatus: "pending",
        authorizationUrl: null,
        state: null,
        message:
          "LinkedIn OAuth yapılandırılmadı (SOCIAL_LINKEDIN_CLIENT_ID / SECRET).",
      };
    }
    const state = await this.oauthStateService.issueState(
      companyId,
      SocialPlatformCode.LinkedIn,
    );
    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "w_member_social,r_organization_social");
    return {
      implementationStatus: "ready",
      authorizationUrl: url.toString(),
      state,
      message: "LinkedIn OAuth yönlendirmesi hazır.",
    };
  }

  private async exchangeMeta(
    companyId: string,
    platformCode: SocialPlatformCode,
    code: string,
  ): Promise<void> {
    const config = this.oauthConfig.getMetaConfig();
    if (!config) {
      throw new ValidationException("Meta OAuth yapılandırması eksik.");
    }
    const tokenUrl = new URL(
      "https://graph.facebook.com/v21.0/oauth/access_token",
    );
    tokenUrl.searchParams.set("client_id", config.appId);
    tokenUrl.searchParams.set("client_secret", config.appSecret);
    tokenUrl.searchParams.set("redirect_uri", config.redirectUri);
    tokenUrl.searchParams.set("code", code);
    const response = await fetch(tokenUrl.toString());
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };
    if (!response.ok || !payload.access_token) {
      throw new ValidationException(
        payload.error?.message ?? "Meta token alınamadı.",
      );
    }
    const enriched = await this.metaGraphService.enrichConnectionAfterOAuth(
      companyId,
      platformCode,
      payload.access_token,
    );
    await this.persistConnection(companyId, platformCode, {
      accessToken: payload.access_token,
      expiresInSec: payload.expires_in ?? null,
      externalAccountId: enriched.externalAccountId,
      displayName: enriched.displayName,
    });
  }

  private async exchangeLinkedIn(
    companyId: string,
    platformCode: SocialPlatformCode,
    code: string,
  ): Promise<void> {
    const config = this.oauthConfig.getLinkedInConfig();
    if (!config) {
      throw new ValidationException("LinkedIn OAuth yapılandırması eksik.");
    }
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      error_description?: string;
    };
    if (!response.ok || !payload.access_token) {
      throw new ValidationException(
        payload.error_description ?? "LinkedIn token alınamadı.",
      );
    }
    const authorUrn = await this.linkedInGraphService.resolveAuthorUrn(
      payload.access_token,
    );
    const organizationUrn =
      await this.linkedInGraphService.resolvePrimaryOrganizationUrn(
        payload.access_token,
      );
    await this.persistConnection(companyId, platformCode, {
      accessToken: payload.access_token,
      expiresInSec: payload.expires_in ?? null,
      externalAccountId: authorUrn?.replace("urn:li:person:", "") ?? null,
      displayName: "LinkedIn bağlantısı",
      refreshToken: payload.refresh_token ?? null,
      linkedInOrganizationUrn: organizationUrn,
    });
  }

  private async persistConnection(
    companyId: string,
    platformCode: SocialPlatformCode,
    tokens: {
      accessToken: string;
      expiresInSec: number | null;
      externalAccountId: string | null;
      displayName: string;
      refreshToken?: string | null;
      linkedInOrganizationUrn?: string | null;
    },
  ): Promise<void> {
    const encKey = this.oauthConfig.getOAuthEncryptionKey();
    if (!encKey) {
      throw new ValidationException("SOCIAL_OAUTH_ENCRYPTION_KEY tanımlı değil.");
    }
    let row = await this.connectionRepository.findOne({
      where: { companyId, platformCode },
    });
    if (!row) {
      row = await this.connectionRepository.save(
        this.connectionRepository.create({
          companyId,
          platformCode,
          statusCode: SocialConnectionStatusCode.PendingOAuth,
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
    row.statusCode = SocialConnectionStatusCode.Connected;
    row.connectedAt = new Date();
    row.lastErrorMessage = null;
    row.displayName = tokens.displayName;
    row.externalAccountId = tokens.externalAccountId;
    row.accessTokenCiphertext = encryptTotpSecret(tokens.accessToken, encKey);
    row.tokenExpiresAt = tokens.expiresInSec
      ? new Date(Date.now() + tokens.expiresInSec * 1000)
      : null;
    if (platformCode === SocialPlatformCode.LinkedIn && encKey) {
      let metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
      if (tokens.refreshToken) {
        row.grantedScopes = mergeLinkedInRefreshToken(
          row.grantedScopes,
          tokens.refreshToken,
          encKey,
        );
        metadata = parseSocialHubConnectionMetadata(row.grantedScopes);
      }
      if (tokens.linkedInOrganizationUrn) {
        metadata = {
          ...metadata,
          linkedInOrganizationUrn: tokens.linkedInOrganizationUrn,
        };
        row.grantedScopes = serializeSocialHubConnectionMetadata(metadata);
      }
    }
    await this.connectionRepository.save(row);
  }
}
