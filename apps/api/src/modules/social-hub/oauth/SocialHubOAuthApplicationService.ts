import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { resolveMetaOAuthScopes } from "./socialHubMetaOAuthScopes";
import { SocialHubInboxSyncApplicationService } from "../SocialHubInboxSyncApplicationService";
import {
  SocialHubAuditActionCode,
  SocialHubAuditService,
} from "../SocialHubAuditService";

@Injectable()
export class SocialHubOAuthApplicationService {
  private readonly logger = new Logger(SocialHubOAuthApplicationService.name);

  public constructor(
    private readonly configService: ConfigService,
    private readonly oauthConfig: SocialHubOAuthConfigService,
    private readonly oauthStateService: SocialHubOAuthStateService,
    @InjectRepository(CompanySocialConnectionEntity)
    private readonly connectionRepository: Repository<CompanySocialConnectionEntity>,
    private readonly metaGraphService: SocialHubMetaGraphService,
    private readonly linkedInGraphService: SocialHubLinkedInGraphService,
    private readonly roadmapOAuthApplicationService: SocialHubRoadmapOAuthApplicationService,
    private readonly inboxSyncApplicationService: SocialHubInboxSyncApplicationService,
    private readonly socialHubAuditService: SocialHubAuditService,
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
          { codeVerifier: stateRow.pkceVerifier },
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
    if (
      platformCode === SocialPlatformCode.Instagram &&
      this.oauthConfig.preferInstagramBusinessLoginOAuth()
    ) {
      const ig = this.oauthConfig.getInstagramLoginConfig()!;
      const url = new URL("https://www.instagram.com/oauth/authorize");
      url.searchParams.set("client_id", ig.appId);
      url.searchParams.set("redirect_uri", config.redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("response_type", "code");
      url.searchParams.set(
        "scope",
        "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
      );
      url.searchParams.set("force_reauth", "true");
      url.searchParams.set("enable_fb_login", "false");
      return {
        implementationStatus: "ready",
        authorizationUrl: url.toString(),
        state,
        message: "Instagram Business Login yönlendirmesi hazır.",
      };
    }
    const scope = resolveMetaOAuthScopes(platformCode);
    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    const configId = this.oauthConfig.getMetaOAuthConfigId(platformCode);
    if (configId) {
      url.searchParams.set("config_id", configId);
      if (platformCode === SocialPlatformCode.Instagram) {
        // Önceki “Devam” akışı sayfa seçimini atlar; yeniden varlık/izin ekranı iste.
        url.searchParams.set("auth_type", "reauthorize");
        url.searchParams.set(
          "extras",
          JSON.stringify({ setup: { channel: "IG_API_ONBOARDING" } }),
        );
      }
    } else {
      url.searchParams.set("scope", scope);
    }
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
    if (
      platformCode === SocialPlatformCode.Instagram &&
      this.oauthConfig.preferInstagramBusinessLoginOAuth()
    ) {
      await this.exchangeInstagramBusinessLogin(companyId, code);
      return;
    }
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
    if (platformCode === SocialPlatformCode.Instagram) {
      await this.metaGraphService.syncInstagramExternalAccountId(companyId);
    }
    if (
      platformCode === SocialPlatformCode.FacebookMessenger ||
      platformCode === SocialPlatformCode.Instagram
    ) {
      await this.syncInboxQuietlyAfterOAuth(companyId, platformCode);
    }
    if (
      platformCode === SocialPlatformCode.WhatsAppCloud &&
      enriched.externalAccountId
    ) {
      await this.metaGraphService.subscribeWhatsAppBusinessAccountWebhooks(
        enriched.externalAccountId,
        payload.access_token,
      );
    }
    if (
      platformCode === SocialPlatformCode.FacebookMessenger &&
      enriched.externalAccountId
    ) {
      const pageToken = await this.metaGraphService.resolvePageAccessToken(
        payload.access_token,
        enriched.externalAccountId,
      );
      if (pageToken) {
        await this.metaGraphService.subscribeFacebookPageWebhooks(
          enriched.externalAccountId,
          pageToken,
        );
      }
    }
    if (platformCode === SocialPlatformCode.Instagram) {
      await this.metaGraphService.applyInstagramLoginMetadata(companyId, {
        instagramAuthMode: "facebook_page",
      });
      await this.metaGraphService.syncInstagramExternalAccountId(companyId);
      const connection = await this.connectionRepository.findOne({
        where: { companyId, platformCode },
      });
      const metadata = parseSocialHubConnectionMetadata(connection?.grantedScopes);
      const pageId = metadata.pageId;
      const igId =
        metadata.instagramBusinessAccountId ??
        this.oauthConfig.getKnownInstagramBusinessAccountId()?.trim() ??
        null;
      if (pageId) {
        const pageToken = await this.metaGraphService.resolvePageAccessToken(
          payload.access_token,
          pageId,
        );
        if (pageToken) {
          await this.metaGraphService.subscribeFacebookPageWebhooks(
            pageId,
            pageToken,
          );
          if (igId) {
            await this.metaGraphService.subscribeInstagramBusinessWebhooks(
              igId,
              pageToken,
            );
          }
        }
      }
    }
  }

  private async exchangeInstagramBusinessLogin(
    companyId: string,
    code: string,
  ): Promise<void> {
    const meta = this.oauthConfig.getMetaConfig();
    const ig = this.oauthConfig.getInstagramLoginConfig();
    if (!meta || !ig) {
      throw new ValidationException("Instagram Login OAuth yapılandırması eksik.");
    }
    const body = new URLSearchParams({
      client_id: ig.appId,
      client_secret: ig.appSecret,
      grant_type: "authorization_code",
      redirect_uri: meta.redirectUri,
      code,
    });
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body,
    });
    const shortPayload = (await shortRes.json()) as {
      access_token?: string;
      user_id?: string | number;
      error_message?: string;
      error_type?: string;
    };
    if (!shortRes.ok || !shortPayload.access_token) {
      throw new ValidationException(
        shortPayload.error_message ?? "Instagram token alınamadı.",
      );
    }
    let accessToken = shortPayload.access_token;
    let expiresInSec: number | null = null;
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", ig.appSecret);
    longUrl.searchParams.set("access_token", accessToken);
    const longRes = await fetch(longUrl.toString());
    const longPayload = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };
    if (longRes.ok && longPayload.access_token) {
      accessToken = longPayload.access_token;
      expiresInSec = longPayload.expires_in ?? null;
    }
    let igUserId = shortPayload.user_id
      ? String(shortPayload.user_id)
      : null;
    let displayName = "Instagram";
    try {
      const meUrl = new URL("https://graph.instagram.com/v21.0/me");
      meUrl.searchParams.set("fields", "id,username,name");
      meUrl.searchParams.set("access_token", accessToken);
      const meRes = await fetch(meUrl.toString());
      const me = (await meRes.json()) as {
        id?: string;
        username?: string;
        name?: string;
      };
      if (me.username) {
        displayName = `@${me.username}`;
      } else if (me.name) {
        displayName = me.name;
      }
      if (me.id) {
        igUserId = me.id;
      }
    } catch {
      // keep default label
    }
    const knownIgId =
      this.oauthConfig.getKnownInstagramBusinessAccountId()?.trim() ?? null;
    const linkedPageId =
      this.oauthConfig.getLinkedFacebookPageId()?.trim() ?? null;
    if (igUserId || knownIgId || linkedPageId) {
      await this.metaGraphService.applyInstagramLoginMetadata(companyId, {
        instagramLoginUserId: igUserId ?? undefined,
        instagramBusinessAccountId: knownIgId ?? undefined,
        pageId: linkedPageId ?? undefined,
        instagramAuthMode: "instagram_login",
      });
    }
    await this.persistConnection(companyId, SocialPlatformCode.Instagram, {
      accessToken,
      expiresInSec,
      externalAccountId: igUserId ?? knownIgId,
      displayName,
    });
    await this.metaGraphService.subscribeInstagramLoginUserWebhooks(accessToken);
    await this.syncInboxQuietlyAfterOAuth(companyId, SocialPlatformCode.Instagram);
  }

  /**
   * Meta Developer “Generate token” → VPS `SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN`.
   * Updates the firm Instagram connection vault + webhook subscription on each API boot.
   */
  public async bootstrapInstagramServiceAccessTokenFromEnv(): Promise<void> {
    const token = this.oauthConfig.getInstagramServiceAccessToken();
    if (!token) {
      return;
    }
    const companyId = this.configService
      .get<string>("SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID")
      ?.trim();
    if (!companyId) {
      this.logger.warn(
        "SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN tanımlı; SOCIAL_HUB_WEBHOOK_DEFAULT_COMPANY_ID eksik — atlanıyor.",
      );
      return;
    }
    await this.metaGraphService.subscribeInstagramLoginUserWebhooks(token);
    await this.repairInstagramEnvMetadata(companyId);
    const forceVault =
      this.configService
        .get<string>("SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN_FORCE_VAULT")
        ?.trim()
        .toLowerCase() === "1";
    const existing = await this.connectionRepository.findOne({
      where: {
        companyId,
        platformCode: SocialPlatformCode.Instagram,
        statusCode: SocialConnectionStatusCode.Connected,
      },
    });
    if (existing?.accessTokenCiphertext && !forceVault) {
      await this.repairInstagramEnvMetadata(companyId);
      this.logger.log(
        `Instagram service token: webhook subscribe only (vault korundu, company=${companyId})`,
      );
      return;
    }
    const igId =
      this.oauthConfig.getKnownInstagramBusinessAccountId()?.trim() ?? null;
    await this.persistConnection(companyId, SocialPlatformCode.Instagram, {
      accessToken: token,
      expiresInSec: null,
      externalAccountId: igId,
      displayName: "lertalogistics",
    });
    this.logger.log(
      `Instagram service access token vault'a yazıldı (company=${companyId} ig=${igId ?? "—"})`,
    );
  }

  /** VPS env: IG business id + linked Facebook Page for DM routing without re-OAuth. */
  private async repairInstagramEnvMetadata(companyId: string): Promise<void> {
    const knownIgId =
      this.oauthConfig.getKnownInstagramBusinessAccountId()?.trim() ?? null;
    const linkedPageId =
      this.oauthConfig.getLinkedFacebookPageId()?.trim() ?? null;
    if (!knownIgId && !linkedPageId) {
      return;
    }
    const connection = await this.connectionRepository.findOne({
      where: { companyId, platformCode: SocialPlatformCode.Instagram },
    });
    if (!connection) {
      return;
    }
    const metadata = parseSocialHubConnectionMetadata(connection.grantedScopes);
    const patch: Partial<typeof metadata> = {};
    if (knownIgId && metadata.instagramBusinessAccountId !== knownIgId) {
      patch.instagramBusinessAccountId = knownIgId;
    }
    if (linkedPageId && metadata.pageId !== linkedPageId) {
      patch.pageId = linkedPageId;
    }
    const external = connection.externalAccountId?.trim();
    if (
      external &&
      knownIgId &&
      external !== knownIgId &&
      !metadata.instagramLoginUserId
    ) {
      patch.instagramLoginUserId = external;
    }
    if (Object.keys(patch).length === 0) {
      return;
    }
    await this.metaGraphService.applyInstagramLoginMetadata(companyId, patch);
    const pageId = linkedPageId ?? patch.pageId;
    if (pageId) {
      const messengerToken = await this.connectionRepository.findOne({
        where: {
          companyId,
          platformCode: SocialPlatformCode.FacebookMessenger,
        },
      });
      const igToken = await this.connectionRepository.findOne({
        where: { companyId, platformCode: SocialPlatformCode.Instagram },
      });
      const userRow = messengerToken ?? igToken;
      if (userRow?.accessTokenCiphertext) {
        const key = this.oauthConfig.getOAuthEncryptionKey();
        if (key) {
          try {
            const userAccess = decryptTotpSecret(
              userRow.accessTokenCiphertext,
              key,
            );
            const pageToken = await this.metaGraphService.resolvePageAccessToken(
              userAccess,
              pageId,
            );
            if (pageToken) {
              await this.metaGraphService.subscribeFacebookPageWebhooks(
                pageId,
                pageToken,
              );
              const igBiz =
                knownIgId ?? patch.instagramBusinessAccountId ?? null;
              if (igBiz) {
                await this.metaGraphService.subscribeInstagramBusinessWebhooks(
                  igBiz,
                  pageToken,
                );
              }
            }
          } catch {
            // best-effort webhook subscribe on boot
          }
        }
      }
    }
    this.logger.log(
      `Instagram metadata repaired from env company=${companyId} keys=${Object.keys(patch).join(",")}`,
    );
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

  private async syncInboxQuietlyAfterOAuth(
    companyId: string,
    platformCode: SocialPlatformCode,
  ): Promise<void> {
    try {
      const result = await this.inboxSyncApplicationService.sync(
        companyId,
        platformCode,
      );
      this.socialHubAuditService.recordCompanySystemEvent(
        companyId,
        SocialHubAuditActionCode.InboxSync,
        `/company/social-hub/oauth/callback (${platformCode})`,
        {
          platformCode,
          importedThreadCount: result.importedThreadCount,
          implementationStatus: result.implementationStatus,
          message: result.message,
          trigger: "post_oauth",
        },
      );
      this.logger.log(
        `Post-OAuth inbox sync ${platformCode}: ${result.message}`,
      );
    } catch (error) {
      this.logger.warn(
        `Post-OAuth inbox sync failed ${platformCode}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
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
