import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
