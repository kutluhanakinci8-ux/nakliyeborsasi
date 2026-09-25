import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../auth/AuthModule";
import { ModularSubscriptionEntitlementService } from "./ModularSubscriptionEntitlementService";
import { SubscriptionPlanController } from "./SubscriptionPlanController";
import { CompanySubscriptionController } from "./CompanySubscriptionController";
import { SubscriptionCatalogModule } from "./SubscriptionCatalogModule";
import { CompanySubscriptionPersistenceService } from "./CompanySubscriptionPersistenceService";
import { CompanySubscriptionApplicationService } from "./CompanySubscriptionApplicationService";

@Module({
  imports: [forwardRef(() => AuthModule), SubscriptionCatalogModule],
  controllers: [SubscriptionPlanController, CompanySubscriptionController],
  providers: [
    ModularSubscriptionEntitlementService,
    CompanySubscriptionPersistenceService,
    CompanySubscriptionApplicationService,
  ],
  exports: [
    ModularSubscriptionEntitlementService,
    CompanySubscriptionPersistenceService,
    CompanySubscriptionApplicationService,
    SubscriptionCatalogModule,
  ],
})
export class SubscriptionModule {}
