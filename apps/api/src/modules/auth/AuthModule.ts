import { Module, forwardRef } from "@nestjs/common";
import { NotificationModule } from "../notification/NotificationModule";
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
import { SubscriptionCatalogModule } from "../subscription/SubscriptionCatalogModule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { MailMailboxEntity } from "../../infrastructure/database/entities/MailMailboxEntity";
import { UserTotpService } from "./UserTotpService";
import { UserWebAuthnCredentialEntity } from "../../infrastructure/database/entities/UserWebAuthnCredentialEntity";
import { UserWebAuthnService } from "./UserWebAuthnService";
import { MobileAuthConfigService } from "./MobileAuthConfigService";
import { MobileAuthBridgeService } from "./MobileAuthBridgeService";
import { MobileAuthBridgeController } from "./MobileAuthBridgeController";

@Module({
  imports: [
    forwardRef(() => NotificationModule),
    SubscriptionCatalogModule,
    TypeOrmModule.forFeature([
      UserAccountEntity,
      MailMailboxEntity,
      UserWebAuthnCredentialEntity,
    ]),
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
  controllers: [AuthenticationController, MobileAuthBridgeController],
  providers: [
    UserCredentialAuthenticationService,
    PasswordHashingService,
    JwtTokenIssuingService,
    JwtPassportStrategy,
    JwtAuthenticationGuard,
    CompanyRolesAuthorizationGuard,
    CompanyWebsiteEnrichmentService,
    InstagramPublicStatsService,
    UserTotpService,
    UserWebAuthnService,
    MobileAuthConfigService,
    MobileAuthBridgeService,
  ],
  exports: [
    JwtAuthenticationGuard,
    CompanyRolesAuthorizationGuard,
    JwtTokenIssuingService,
    PasswordHashingService,
    UserTotpService,
    UserWebAuthnService,
  ],
})
export class AuthModule {}
