import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { IntegrationConfigurationService } from "./IntegrationConfigurationService";
import { IntegrationHttpExecutor } from "./IntegrationHttpExecutor";
import { ExternalFreightOfferMapper } from "./ExternalFreightOfferMapper";
import { LardiTransFreightDataAdapter } from "./providers/LardiTransFreightDataAdapter";
import { DellaFreightDataAdapter } from "./providers/DellaFreightDataAdapter";
import { DatFreightDataAdapter } from "./providers/DatFreightDataAdapter";
import { TruckstopFreightDataAdapter } from "./providers/TruckstopFreightDataAdapter";
import { SennderFreightDataAdapter } from "./providers/SennderFreightDataAdapter";
import { FreightosFreightDataAdapter } from "./providers/FreightosFreightDataAdapter";
import { ExternalFreightDataOrchestrator } from "./ExternalFreightDataOrchestrator";
import { IntegrationFreightSearchApplicationService } from "./IntegrationFreightSearchApplicationService";
import { ExternalFreightSearchController } from "./ExternalFreightSearchController";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";
import { RedisModule } from "../../infrastructure/redis/RedisModule";

@Module({
  imports: [HttpModule, SubscriptionModule, AuthModule, RedisModule],
  controllers: [ExternalFreightSearchController],
  providers: [
    IntegrationConfigurationService,
    IntegrationHttpExecutor,
    ExternalFreightOfferMapper,
    LardiTransFreightDataAdapter,
    DellaFreightDataAdapter,
    DatFreightDataAdapter,
    TruckstopFreightDataAdapter,
    SennderFreightDataAdapter,
    FreightosFreightDataAdapter,
    ExternalFreightDataOrchestrator,
    IntegrationFreightSearchApplicationService,
  ],
  exports: [ExternalFreightDataOrchestrator],
})
export class IntegrationModule {}
