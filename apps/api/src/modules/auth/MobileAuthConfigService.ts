import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MobileAuthBridgeService } from "./MobileAuthBridgeService";

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
  public constructor(
    private readonly configService: ConfigService,
    private readonly mobileAuthBridgeService: MobileAuthBridgeService,
  ) {}

  public getConfig(): MobileAuthConfigResponse {
    const bridgeIssuer = this.mobileAuthBridgeService.resolveIssuerBase();
    const bridgeClient =
      this.configService.get<string>("MOBILE_OAUTH_LERTA_CLIENT_ID")?.trim() ??
      "lerta-mobile-native";
    const issuer =
      this.configService.get<string>("MOBILE_OAUTH_ISSUER")?.trim() ??
      bridgeIssuer;
    const clientId =
      this.configService.get<string>("MOBILE_OAUTH_CLIENT_ID")?.trim() ??
      (bridgeIssuer ? bridgeClient : null);
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
