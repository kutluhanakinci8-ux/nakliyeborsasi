import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LocalizationModule } from "./modules/localization/LocalizationModule";
import { SubscriptionModule } from "./modules/subscription/SubscriptionModule";
import { IntegrationModule } from "./modules/integration/IntegrationModule";
import { MarketplaceModule } from "./modules/marketplace/MarketplaceModule";
import { IdentityModule } from "./modules/identity/IdentityModule";
import { HealthModule } from "./modules/health/HealthModule";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LocalizationModule,
    SubscriptionModule,
    IdentityModule,
    IntegrationModule,
    MarketplaceModule,
    HealthModule,
  ],
})
export class AppModule {}
