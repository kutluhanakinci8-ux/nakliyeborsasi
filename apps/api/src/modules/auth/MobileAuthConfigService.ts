import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type MobileAuthConfigResponse = {
  passwordLoginEnabled: true;
  passwordLoginPath: "/auth/login";
  oauth: {
    enabled: boolean;
    issuer: string | null;
    clientId: string | null;
    scopes: string[];
    authorizationEndpoint: string | null;
    tokenEndpoint: string | null;
  };
};

@Injectable()
export class MobileAuthConfigService {
  public constructor(private readonly configService: ConfigService) {}

  public getConfig(): MobileAuthConfigResponse {
    const issuer =
      this.configService.get<string>("MOBILE_OAUTH_ISSUER")?.trim() ?? null;
    const clientId =
      this.configService.get<string>("MOBILE_OAUTH_CLIENT_ID")?.trim() ?? null;
    const scopesRaw =
      this.configService.get<string>("MOBILE_OAUTH_SCOPES")?.trim() ??
      "openid profile email";
    const scopes = scopesRaw.split(/[\s,]+/).filter(Boolean);
    const enabled = Boolean(issuer && clientId);
    const authorizationEndpoint = issuer
      ? `${issuer.replace(/\/$/, "")}/authorize`
      : null;
    const tokenEndpoint = issuer
      ? `${issuer.replace(/\/$/, "")}/token`
      : null;
    return {
      passwordLoginEnabled: true,
      passwordLoginPath: "/auth/login",
      oauth: {
        enabled,
        issuer,
        clientId: enabled ? clientId : null,
        scopes,
        authorizationEndpoint,
        tokenEndpoint,
      },
    };
  }
}
