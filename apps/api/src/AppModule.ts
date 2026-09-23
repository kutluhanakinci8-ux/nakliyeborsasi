import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { LocalizationModule } from "./modules/localization/LocalizationModule";
import { SubscriptionModule } from "./modules/subscription/SubscriptionModule";
import { IntegrationModule } from "./modules/integration/IntegrationModule";
import { MarketplaceModule } from "./modules/marketplace/MarketplaceModule";
import { IdentityModule } from "./modules/identity/IdentityModule";
import { PanelModule } from "./modules/panel/PanelModule";
import { HealthModule } from "./modules/health/HealthModule";
import { DatabaseModule } from "./infrastructure/database/DatabaseModule";
import { AuthModule } from "./modules/auth/AuthModule";
import { AuditModule } from "./infrastructure/audit/AuditModule";
import { HttpRequestAuditLoggingInterceptor } from "./infrastructure/audit/HttpRequestAuditLoggingInterceptor";
import { AuctionModule } from "./modules/auction/AuctionModule";
import { MessagingModule } from "./modules/messaging/MessagingModule";
import { TrustScoreModule } from "./modules/trust/TrustScoreModule";
import { PlatformAdminModule } from "./modules/platform-admin/PlatformAdminModule";
import { FleetModule } from "./modules/fleet/FleetModule";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), ".env"),
        join(process.cwd(), "../..", ".env"),
      ],
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    LocalizationModule,
    SubscriptionModule,
    IdentityModule,
    IntegrationModule,
    MarketplaceModule,
    AuctionModule,
    MessagingModule,
    TrustScoreModule,
    PlatformAdminModule,
    FleetModule,
    PanelModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpRequestAuditLoggingInterceptor,
    },
  ],
})
export class AppModule {}
