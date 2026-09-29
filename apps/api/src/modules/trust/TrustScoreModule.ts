import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { CompanyTrustReviewInviteEntity } from "../../infrastructure/database/entities/CompanyTrustReviewInviteEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { CompanyMembershipEntity } from "../../infrastructure/database/entities/CompanyMembershipEntity";
import { TrustReviewInviteService } from "./TrustReviewInviteService";
import { TrustReviewNotificationService } from "./TrustReviewNotificationService";
import { TrustReviewReminderService } from "./TrustReviewReminderService";
import { TrustReviewReminderSweepTask } from "./TrustReviewReminderSweepTask";
import { NotificationModule } from "../notification/NotificationModule";
import { MessagingModule } from "../messaging/MessagingModule";
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
      AuctionSessionEntity,
      CompanyMembershipEntity,
    ]),
    SubscriptionModule,
    AuthModule,
    NotificationModule,
    forwardRef(() => MessagingModule),
  ],
  controllers: [TrustScoreModuleStatusController, TrustScoreController],
  providers: [
    TrustScoreApplicationService,
    TrustReviewInviteService,
    TrustReviewNotificationService,
    TrustReviewReminderService,
    TrustReviewReminderSweepTask,
  ],
  exports: [
    TrustScoreApplicationService,
    TrustReviewInviteService,
    TrustReviewNotificationService,
  ],
})
export class TrustScoreModule {}
