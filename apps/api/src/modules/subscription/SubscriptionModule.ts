import { Module } from "@nestjs/common";
import { ModularSubscriptionEntitlementService } from "./ModularSubscriptionEntitlementService";
import { SubscriptionPlanController } from "./SubscriptionPlanController";
import { SubscriptionCatalogModule } from "./SubscriptionCatalogModule";
import { CompanySubscriptionPersistenceService } from "./CompanySubscriptionPersistenceService";

@Module({
  imports: [SubscriptionCatalogModule],
  controllers: [SubscriptionPlanController],
  providers: [
    ModularSubscriptionEntitlementService,
    CompanySubscriptionPersistenceService,
  ],
  exports: [
    ModularSubscriptionEntitlementService,
    CompanySubscriptionPersistenceService,
    SubscriptionCatalogModule,
  ],
})
export class SubscriptionModule {}
