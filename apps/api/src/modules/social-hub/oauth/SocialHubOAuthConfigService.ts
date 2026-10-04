import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SocialPlatformCode } from "@nakliyeborsasi/core";

export type MetaOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  webhookVerifyToken: string;
};

export type LinkedInOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type TikTokOAuthConfig = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
};

export type YouTubeOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type XOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

@Injectable()
export class SocialHubOAuthConfigService {
  public constructor(private readonly configService: ConfigService) {}

  public getMetaConfig(): MetaOAuthConfig | null {
    const appId = this.configService.get<string>("SOCIAL_META_APP_ID")?.trim();
    const appSecret = this.configService
      .get<string>("SOCIAL_META_APP_SECRET")
      ?.trim();
    const redirectUri = this.resolveRedirectUri("SOCIAL_META_OAUTH_REDIRECT_URI");
    if (!appId || !appSecret || !redirectUri) {
      return null;
    }
    return {
      appId,
      appSecret,
      redirectUri,
      webhookVerifyToken:
        this.configService.get<string>("SOCIAL_META_WEBHOOK_VERIFY_TOKEN")?.trim() ??
        "",
    };
  }

  public getYouTubeConfig(): YouTubeOAuthConfig | null {
    const clientId = this.configService
      .get<string>("SOCIAL_YOUTUBE_OAUTH_CLIENT_ID")
      ?.trim();
    const clientSecret = this.configService
      .get<string>("SOCIAL_YOUTUBE_OAUTH_CLIENT_SECRET")
      ?.trim();
    const redirectUri = this.resolveRedirectUri(
      "SOCIAL_YOUTUBE_OAUTH_REDIRECT_URI",
    );
    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }
    return { clientId, clientSecret, redirectUri };
  }

  public getXConfig(): XOAuthConfig | null {
    const clientId = this.configService
      .get<string>("SOCIAL_X_OAUTH_CLIENT_ID")
      ?.trim();
    const clientSecret = this.configService
      .get<string>("SOCIAL_X_OAUTH_CLIENT_SECRET")
      ?.trim();
    const redirectUri = this.resolveRedirectUri("SOCIAL_X_OAUTH_REDIRECT_URI");
    const scopes =
      this.configService.get<string>("SOCIAL_X_OAUTH_SCOPES")?.trim() ??
      "tweet.read tweet.write users.read offline.access";
    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }
    return { clientId, clientSecret, redirectUri, scopes };
  }

  public getTikTokConfig(): TikTokOAuthConfig | null {
    const clientKey = this.configService
      .get<string>("SOCIAL_TIKTOK_OAUTH_CLIENT_ID")
      ?.trim();
    const clientSecret = this.configService
      .get<string>("SOCIAL_TIKTOK_OAUTH_CLIENT_SECRET")
      ?.trim();
    const redirectUri = this.resolveRedirectUri(
      "SOCIAL_TIKTOK_OAUTH_REDIRECT_URI",
    );
    if (!clientKey || !clientSecret || !redirectUri) {
      return null;
    }
    return { clientKey, clientSecret, redirectUri };
  }

  public getLinkedInConfig(): LinkedInOAuthConfig | null {
    const clientId = this.configService
      .get<string>("SOCIAL_LINKEDIN_CLIENT_ID")
      ?.trim();
    const clientSecret = this.configService
      .get<string>("SOCIAL_LINKEDIN_CLIENT_SECRET")
      ?.trim();
    const redirectUri = this.resolveRedirectUri(
      "SOCIAL_LINKEDIN_OAUTH_REDIRECT_URI",
    );
    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }
    return { clientId, clientSecret, redirectUri };
  }

  public getWebAppReturnUrl(): string {
    const base =
      this.configService.get<string>("SOCIAL_HUB_WEB_RETURN_URL")?.trim() ??
      this.configService.get<string>("WEB_PUBLIC_APP_URL")?.trim() ??
      "https://app.lerta.com.tr";
    return `${base.replace(/\/$/, "")}/hesap/sosyal-medya?tab=connections`;
  }

  /** Instagram App ID + secret from Meta → Instagram → Business login settings (≠ Meta App ID). */
  public hasDedicatedInstagramLoginApp(): boolean {
    const appId = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_APP_ID")
      ?.trim();
    const appSecret = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_APP_SECRET")
      ?.trim();
    return Boolean(appId && appSecret);
  }

  public getInstagramLoginConfig(): { appId: string; appSecret: string } | null {
    const appId = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_APP_ID")
      ?.trim();
    const appSecret = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_APP_SECRET")
      ?.trim();
    if (!appId || !appSecret) {
      return null;
    }
    return { appId, appSecret };
  }

  /** Force legacy facebook.com/dialog/oauth + config_id for Instagram (often disabled on Meta apps). */
  public useFacebookDialogForInstagramOAuth(): boolean {
    const flag = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_OAUTH_USE_FACEBOOK_DIALOG")
      ?.trim()
      .toLowerCase();
    return flag === "1" || flag === "true" || flag === "yes";
  }

  public useInstagramLoginOAuth(): boolean {
    const flag = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN")
      ?.trim()
      .toLowerCase();
    return flag === "1" || flag === "true" || flag === "yes";
  }

  /** Instagram → instagram.com/oauth/authorize only with dedicated Instagram App ID (never Meta App ID). */
  public preferInstagramBusinessLoginOAuth(): boolean {
    if (this.useFacebookDialogForInstagramOAuth()) {
      return false;
    }
    if (!this.hasDedicatedInstagramLoginApp()) {
      return false;
    }
    if (this.useInstagramLoginOAuth()) {
      return true;
    }
    const explicitOff = this.configService
      .get<string>("SOCIAL_META_INSTAGRAM_OAUTH_USE_LOGIN")
      ?.trim()
      .toLowerCase();
    if (explicitOff === "0" || explicitOff === "false" || explicitOff === "no") {
      return false;
    }
    return true;
  }

  /** Fallback when Graph does not return instagram_business_account on the Page. */
  public getKnownInstagramBusinessAccountId(): string | null {
    return (
      this.configService
        .get<string>("SOCIAL_META_INSTAGRAM_BUSINESS_ACCOUNT_ID")
        ?.trim() ?? null
    );
  }

  /** Facebook Page linked to the Instagram professional account (DM via Page inbox). */
  public getLinkedFacebookPageId(): string | null {
    return (
      this.configService.get<string>("SOCIAL_META_FACEBOOK_PAGE_ID")?.trim() ??
      this.configService.get<string>("SOCIAL_META_LINKED_PAGE_ID")?.trim() ??
      null
    );
  }

  /**
   * Meta Developer → API setup → Generate token (Instagram user access token).
   * VPS `.env` only — never commit. Overrides vault token on API boot when set.
   */
  public getInstagramServiceAccessToken(): string | null {
    return (
      this.configService
        .get<string>("SOCIAL_META_INSTAGRAM_SERVICE_ACCESS_TOKEN")
        ?.trim() ?? null
    );
  }

  public getMetaOAuthConfigId(platformCode: SocialPlatformCode): string | null {
    const envByPlatform: Partial<Record<SocialPlatformCode, string>> = {
      [SocialPlatformCode.WhatsAppCloud]:
        "SOCIAL_META_OAUTH_CONFIG_ID_WHATSAPP_CLOUD",
      [SocialPlatformCode.FacebookMessenger]:
        "SOCIAL_META_OAUTH_CONFIG_ID_FACEBOOK_MESSENGER",
      [SocialPlatformCode.Instagram]: "SOCIAL_META_OAUTH_CONFIG_ID_INSTAGRAM",
    };
    const platformKey = envByPlatform[platformCode];
    if (platformKey) {
      const explicit = this.configService.get<string>(platformKey)?.trim();
      if (explicit) {
        return explicit;
      }
    }
    if (platformCode === SocialPlatformCode.WhatsAppCloud) {
      return (
        this.configService.get<string>("SOCIAL_META_OAUTH_CONFIG_ID")?.trim() ??
        null
      );
    }
    return null;
  }

  public getOAuthEncryptionKey(): string | null {
    const key =
      this.configService.get<string>("SOCIAL_OAUTH_ENCRYPTION_KEY")?.trim() ??
      this.configService.get<string>("JWT_ACCESS_TOKEN_SECRET")?.trim();
    return key && key.length >= 16 ? key : null;
  }

  private resolveRedirectUri(envKey: string): string | null {
    const explicit = this.configService.get<string>(envKey)?.trim();
    if (explicit) {
      return explicit;
    }
    const apiBase =
      this.configService.get<string>("API_PUBLIC_BASE_URL")?.trim() ??
      "https://app.lerta.com.tr/api/v1";
    return `${apiBase.replace(/\/$/, "")}/company/social-hub/oauth/callback`;
  }
}
