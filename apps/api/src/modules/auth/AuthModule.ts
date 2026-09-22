import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthenticationController } from "./AuthenticationController";
import { UserCredentialAuthenticationService } from "./UserCredentialAuthenticationService";
import { PasswordHashingService } from "./PasswordHashingService";
import { JwtTokenIssuingService } from "./JwtTokenIssuingService";
import { JwtPassportStrategy } from "./JwtPassportStrategy";
import { JwtAuthenticationGuard } from "./JwtAuthenticationGuard";
import { CompanyRolesAuthorizationGuard } from "./CompanyRolesAuthorizationGuard";
import { CompanyWebsiteEnrichmentService } from "./CompanyWebsiteEnrichmentService";
import { InstagramPublicStatsService } from "./InstagramPublicStatsService";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        if (!secret) {
          throw new Error("JWT_SECRET is required");
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>("JWT_EXPIRES_IN") ?? "12h",
          },
        };
      },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    UserCredentialAuthenticationService,
    PasswordHashingService,
    JwtTokenIssuingService,
    JwtPassportStrategy,
    JwtAuthenticationGuard,
    CompanyRolesAuthorizationGuard,
    CompanyWebsiteEnrichmentService,
    InstagramPublicStatsService,
  ],
  exports: [
    JwtAuthenticationGuard,
    CompanyRolesAuthorizationGuard,
    JwtTokenIssuingService,
  ],
})
export class AuthModule {}
