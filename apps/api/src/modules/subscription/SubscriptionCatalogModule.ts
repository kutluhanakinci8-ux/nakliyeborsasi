import { Module } from "@nestjs/common";
import { SubscriptionPlanCatalog } from "./SubscriptionPlanCatalog";

@Module({
  providers: [SubscriptionPlanCatalog],
  exports: [SubscriptionPlanCatalog],
})
export class SubscriptionCatalogModule {}
