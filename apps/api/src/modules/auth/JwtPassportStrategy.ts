import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import {
  AuthenticatedUserContext,
  AuthenticationException,
  CompanyRoleCode,
} from "@nakliyeborsasi/core";
import { JwtAccessTokenClaims } from "./JwtAccessTokenClaims";

@Injectable()
export class JwtPassportStrategy extends PassportStrategy(Strategy) {
  public constructor(configService: ConfigService) {
    const jwtSecret = configService.get<string>("JWT_SECRET");
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is required");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  public validate(payload: JwtAccessTokenClaims): AuthenticatedUserContext {
    if (!payload.sub || !payload.companyId) {
      throw new AuthenticationException("Invalid access token");
    }
    const roleCodes = (payload.roleCodes ?? []).map(
      (role) => role as CompanyRoleCode,
    );
    return new AuthenticatedUserContext({
      userId: payload.sub,
      companyId: payload.companyId,
      emailAddress: payload.emailAddress,
      roleCodes,
    });
  }
}
