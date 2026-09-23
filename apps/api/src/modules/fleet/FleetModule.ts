import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FleetController } from "./FleetController";
import { FleetApplicationService } from "./FleetApplicationService";
import { TelemetryApplicationService } from "./telematics/TelemetryApplicationService";
import { TelemetryDriverController } from "./telematics/TelemetryDriverController";
import { TelemetryIngestController } from "./telematics/TelemetryIngestController";
import { TelemetryDeviceGuard } from "./telematics/TelemetryDeviceGuard";
import { FleetTelemetryDeviceEntity } from "../../infrastructure/database/entities/FleetTelemetryDeviceEntity";
import { FleetTelemetryConsentLogEntity } from "../../infrastructure/database/entities/FleetTelemetryConsentLogEntity";
import { FleetTelemetryEventEntity } from "../../infrastructure/database/entities/FleetTelemetryEventEntity";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { FleetDriverEntity } from "../../infrastructure/database/entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../../infrastructure/database/entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "../../infrastructure/database/entities/FleetDriverVehicleAssignmentEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";

@Module({
  imports: [
    SubscriptionModule,
    AuthModule,
    TypeOrmModule.forFeature([
      CompanyEntity,
      FleetDriverEntity,
      FleetVehicleEntity,
      FleetDriverVehicleAssignmentEntity,
      FreightListingEntity,
      AuctionSessionEntity,
      UserAccountEntity,
      CompanyMembershipEntity,
      FleetTelemetryDeviceEntity,
      FleetTelemetryConsentLogEntity,
      FleetTelemetryEventEntity,
    ]),
  ],
  controllers: [FleetController, TelemetryDriverController, TelemetryIngestController],
  providers: [FleetApplicationService, TelemetryApplicationService, TelemetryDeviceGuard],
  exports: [FleetApplicationService],
})
export class FleetModule {}
