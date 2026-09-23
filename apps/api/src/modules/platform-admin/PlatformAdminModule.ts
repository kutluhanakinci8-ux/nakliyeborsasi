import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/AuthModule";
import { SubscriptionCatalogModule } from "../subscription/SubscriptionCatalogModule";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { UserAccountEntity } from "../../infrastructure/database/entities/UserAccountEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { CompanySubscriptionEntity } from "../../infrastructure/database/entities/CompanySubscriptionEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { MessageThreadEntity } from "../../infrastructure/database/entities/MessageThreadEntity";
import { AuditLogEntity } from "../../infrastructure/database/entities/AuditLogEntity";
import { FleetDriverEntity } from "../../infrastructure/database/entities/FleetDriverEntity";
import { FleetVehicleEntity } from "../../infrastructure/database/entities/FleetVehicleEntity";
import { PlatformAdminController } from "./PlatformAdminController";
import { PlatformAdminApplicationService } from "./PlatformAdminApplicationService";
import { PlatformAdminGuard } from "./PlatformAdminGuard";

@Module({
  imports: [
    AuthModule,
    SubscriptionCatalogModule,
    TypeOrmModule.forFeature([
      CompanyEntity,
      UserAccountEntity,
      CompanyMembershipEntity,
      CompanySubscriptionEntity,
      FreightListingEntity,
      AuctionSessionEntity,
      CompanyTrustReviewEntity,
      MessageThreadEntity,
      AuditLogEntity,
      FleetDriverEntity,
      FleetVehicleEntity,
    ]),
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminApplicationService, PlatformAdminGuard],
})
export class PlatformAdminModule {}
