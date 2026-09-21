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
}
