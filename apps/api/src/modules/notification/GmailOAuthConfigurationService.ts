import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GmailOAuthConfigurationService {
  public constructor(private readonly configService: ConfigService) {}

  public isConfigured(): boolean {
    return Boolean(this.getClientId() && this.getClientSecret());
  }

  public getClientId(): string | undefined {
    return this.configService.get<string>("GOOGLE_GMAIL_CLIENT_ID");
  }

  public getClientSecret(): string | undefined {
    return this.configService.get<string>("GOOGLE_GMAIL_CLIENT_SECRET");
  }

  public resolveRedirectUri(): string {
    const explicit = this.configService.get<string>(
      "GOOGLE_GMAIL_OAUTH_REDIRECT_URI",
    );
    if (explicit?.trim()) {
      return explicit.trim();
    }
    const web =
      this.configService.get<string>("WEB_PUBLIC_BASE_URL") ??
      "http://localhost:3011";
    const base = web.replace(/\/$/, "");
    if (base.includes(":3011")) {
      return base.replace(":3011", ":3010") +
        "/api/v1/platform-admin/gmail/oauth/callback";
    }
    return `${base}/api/v1/platform-admin/gmail/oauth/callback`;
  }

  public resolveWebAdminReturnUrl(): string {
    const web =
      this.configService.get<string>("WEB_PUBLIC_BASE_URL") ??
      "http://localhost:3011";
    return `${web.replace(/\/$/, "")}/admin/bildirimler`;
  }

  public getBootstrapRefreshToken(): string | undefined {
    return this.configService.get<string>("GMAIL_OAUTH_REFRESH_TOKEN");
  }
}
