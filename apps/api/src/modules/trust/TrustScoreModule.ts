import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { CompanyTrustReviewInviteEntity } from "../../infrastructure/database/entities/CompanyTrustReviewInviteEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { TrustReviewInviteService } from "./TrustReviewInviteService";
import { TrustScoreModuleStatusController } from "./TrustScoreModuleStatusController";
import { TrustScoreController } from "./TrustScoreController";
import { TrustScoreApplicationService } from "./TrustScoreApplicationService";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyTrustReviewEntity,
      CompanyTrustReviewInviteEntity,
      CompanyEntity,
      AuctionBidEntity,
      FreightListingEntity,
    ]),
    SubscriptionModule,
    AuthModule,
  ],
  controllers: [TrustScoreModuleStatusController, TrustScoreController],
  providers: [TrustScoreApplicationService, TrustReviewInviteService],
  exports: [TrustScoreApplicationService, TrustReviewInviteService],
})
export class TrustScoreModule {}
