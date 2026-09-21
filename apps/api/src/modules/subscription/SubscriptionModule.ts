import { Module } from "@nestjs/common";
import { SubscriptionPlanCatalog } from "./SubscriptionPlanCatalog";
import { CompanySubscriptionStore } from "./CompanySubscriptionStore";
import { ModularSubscriptionEntitlementService } from "./ModularSubscriptionEntitlementService";
import { SubscriptionPlanController } from "./SubscriptionPlanController";

@Module({
  controllers: [SubscriptionPlanController],
  providers: [
    SubscriptionPlanCatalog,
    CompanySubscriptionStore,
    ModularSubscriptionEntitlementService,
  ],
  exports: [ModularSubscriptionEntitlementService, CompanySubscriptionStore],
})
export class SubscriptionModule {}
