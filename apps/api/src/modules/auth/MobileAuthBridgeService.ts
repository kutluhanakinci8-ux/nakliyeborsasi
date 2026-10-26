import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { UserCredentialAuthenticationService } from "./UserCredentialAuthenticationService";
import { JwtTokenIssuingService } from "./JwtTokenIssuingService";
import { UserTotpService } from "./UserTotpService";
import { AuthNotificationService } from "../notification/AuthNotificationService";
import { authRequestContextFromHttp } from "../notification/AuthRequestContext";

export type OAuthTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
};

@Injectable()
export class MobileAuthBridgeService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly userCredentialAuthenticationService: UserCredentialAuthenticationService,
    private readonly jwtTokenIssuingService: JwtTokenIssuingService,
    private readonly userTotpService: UserTotpService,
    private readonly authNotificationService: AuthNotificationService,
  ) {}

  public isBridgeEnabled(): boolean {
    return (
      this.configService.get<string>("MOBILE_OAUTH_LERTA_BRIDGE")?.trim() ===
      "1"
    );
  }

  public resolveIssuerBase(): string | null {
    if (!this.isBridgeEnabled()) {
      return null;
    }
    const apiPublic =
      this.configService.get<string>("API_PUBLIC_BASE_URL")?.trim() ??
      this.configService.get<string>("MESSAGING_WEB_PUBLIC_URL")?.trim();
    if (!apiPublic) {
      return null;
    }
    const base = apiPublic.replace(/\/$/, "");
    return `${base}/auth/mobile`;
  }

  public openIdConfiguration(): Record<string, unknown> | null {
    const issuer = this.resolveIssuerBase();
    if (!issuer) {
      return null;
    }
    return {
      issuer,
      token_endpoint: `${issuer}/token`,
      grant_types_supported: ["password"],
      token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
      scopes_supported: ["openid", "profile", "email"],
    };
  }

  public async issuePasswordGrantToken(
    username: string,
    password: string,
    request: Request,
  ): Promise<OAuthTokenResponse> {
    if (!this.isBridgeEnabled()) {
      throw new UnauthorizedException("Mobile OAuth bridge disabled");
    }
    const authenticatedUser =
      await this.userCredentialAuthenticationService.authenticateCredentials({
        emailAddress: username,
        password,
      });
    const totpEnabled = await this.userTotpService.isEnabled(
      authenticatedUser.userId,
    );
    if (totpEnabled) {
      throw new UnauthorizedException(
        "TOTP required — complete login via /auth/login/totp",
      );
    }
    const http = authRequestContextFromHttp(
      request.ip,
      request.headers["x-forwarded-for"]?.toString(),
      request.headers["user-agent"],
    );
    await this.authNotificationService.afterLogin(authenticatedUser, http);
    const accessToken =
      this.jwtTokenIssuingService.issueAccessToken(authenticatedUser);
    const expiresIn = this.parseExpiresInSeconds(
      this.configService.get<string>("JWT_EXPIRES_IN") ?? "12h",
    );
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
    };
  }

  private parseExpiresInSeconds(raw: string): number {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10);
    }
    const match = /^(\d+)([smhd])$/i.exec(trimmed);
    if (!match) {
      return 43_200;
    }
    const value = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit === "s") {
      return value;
    }
    if (unit === "m") {
      return value * 60;
    }
    if (unit === "h") {
      return value * 3600;
    }
    return value * 86_400;
  }
}
