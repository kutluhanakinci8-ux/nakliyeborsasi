import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FleetController } from "./FleetController";
import { FleetApplicationService } from "./FleetApplicationService";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { FleetDriverEntity } from "../../infrastructure/database/entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../../infrastructure/database/entities/FleetVehicleEntity";
import { FleetDriverVehicleAssignmentEntity } from "../../infrastructure/database/entities/FleetDriverVehicleAssignmentEntity";

@Module({
  imports: [
    SubscriptionModule,
    AuthModule,
    TypeOrmModule.forFeature([
      CompanyEntity,
      FleetDriverEntity,
      FleetVehicleEntity,
      FleetDriverVehicleAssignmentEntity,
    ]),
  ],
  controllers: [FleetController],
  providers: [FleetApplicationService],
  exports: [FleetApplicationService],
})
export class FleetModule {}
