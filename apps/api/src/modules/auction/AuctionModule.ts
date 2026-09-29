import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { TrustScoreModule } from "../trust/TrustScoreModule";
import { AuctionSessionApplicationService } from "./AuctionSessionApplicationService";
import { AuctionSessionController } from "./AuctionSessionController";
import { AuctionSessionFinalizationService } from "./AuctionSessionFinalizationService";
import { AuctionExpiredSessionSweepTask } from "./AuctionExpiredSessionSweepTask";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";
import { MessagingModule } from "../messaging/MessagingModule";
import { NotificationModule } from "../notification/NotificationModule";
import { AuctionListingPriceActionService } from "./AuctionListingPriceActionService";
import { AuctionTransportCompletionService } from "./AuctionTransportCompletionService";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuctionSessionEntity,
      AuctionBidEntity,
      FreightListingEntity,
      CompanyEntity,
    ]),
    SubscriptionModule,
    AuthModule,
    TrustScoreModule,
    forwardRef(() => MessagingModule),
    NotificationModule,
  ],
  controllers: [AuctionSessionController],
  providers: [
    AuctionSessionApplicationService,
    AuctionSessionFinalizationService,
    AuctionExpiredSessionSweepTask,
    AuctionListingPriceActionService,
    AuctionTransportCompletionService,
  ],
  exports: [AuctionListingPriceActionService],
})
export class AuctionModule {}
