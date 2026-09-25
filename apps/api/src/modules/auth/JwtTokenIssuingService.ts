import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthenticatedUserContext } from "@nakliyeborsasi/core";
import { JwtAccessTokenClaims } from "./JwtAccessTokenClaims";

@Injectable()
export class JwtTokenIssuingService {
  public constructor(private readonly jwtService: JwtService) {}

  public issueAccessToken(
    authenticatedUser: AuthenticatedUserContext,
  ): string {
    const claims = new JwtAccessTokenClaims({
      sub: authenticatedUser.userId,
      companyId: authenticatedUser.companyId,
      emailAddress: authenticatedUser.emailAddress,
      roleCodes: [...authenticatedUser.roleCodes],
    });
    return this.jwtService.sign({ ...claims });
  }

  public issueTotpLoginChallengeToken(userId: string): string {
    return this.jwtService.sign(
      { typ: "totp_login", sub: userId },
      { expiresIn: "5m" },
    );
  }

  public verifyTotpLoginChallengeToken(token: string): string {
    const payload = this.jwtService.verify<{ typ?: string; sub?: string }>(
      token,
    );
    if (payload.typ !== "totp_login" || !payload.sub) {
      throw new Error("Invalid TOTP challenge");
    }
    return payload.sub;
  }
}
