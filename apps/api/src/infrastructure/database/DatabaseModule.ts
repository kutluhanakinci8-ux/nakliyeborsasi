import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TypeOrmConfigurationFactory } from "./TypeOrmConfigurationFactory";
import { CompanyEntity } from "./entities/CompanyEntity";
import { UserAccountEntity } from "./entities/UserAccountEntity";
import { CompanyMembershipEntity } from "./entities/CompanyMembershipEntity";
import { SubscriptionPlanEntity } from "./entities/SubscriptionPlanEntity";
import { CompanySubscriptionEntity } from "./entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "./entities/FreightListingEntity";
import { AuditLogEntity } from "./entities/AuditLogEntity";
import { AuctionSessionEntity } from "./entities/AuctionSessionEntity";
import { AuctionBidEntity } from "./entities/AuctionBidEntity";
import { MessageThreadEntity } from "./entities/MessageThreadEntity";
import { MessageEntity } from "./entities/MessageEntity";
import { CompanyTrustReviewEntity } from "./entities/CompanyTrustReviewEntity";
import { FleetDriverEntity } from "./entities/FleetDriverEntity";
import { FleetVehicleEntity } from "./entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "./entities/FleetDriverVehicleAssignmentEntity";
import { FleetTelemetryDeviceEntity } from "./entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryConsentLogEntity } from "./entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryEventEntity } from "./entities/FleetTelemetryEventEntity";
import { DatabaseSeedRunner } from "./seed/DatabaseSeedRunner";
import { SubscriptionCatalogModule } from "../../modules/subscription/SubscriptionCatalogModule";

@Global()
@Module({
  imports: [
    SubscriptionCatalogModule,
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigurationFactory,
    }),
    TypeOrmModule.forFeature([
      CompanyEntity,
      UserAccountEntity,
      CompanyMembershipEntity,
      SubscriptionPlanEntity,
      CompanySubscriptionEntity,
      FreightListingEntity,
      AuditLogEntity,
      AuctionSessionEntity,
      AuctionBidEntity,
      MessageThreadEntity,
      MessageEntity,
      CompanyTrustReviewEntity,
      FleetDriverEntity,
      FleetVehicleEntity,
      FleetDriverVehicleAssignmentEntity,
      FleetTelemetryDeviceEntity,
      FleetTelemetryConsentLogEntity,
      FleetTelemetryEventEntity,
    ]),
  ],
  providers: [DatabaseSeedRunner],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
