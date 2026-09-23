import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CompanyTrustReviewEntity } from "../../infrastructure/database/entities/CompanyTrustReviewEntity";
import { CompanyEntity } from "../../infrastructure/database/entities/CompanyEntity";
import { TrustScoreModuleStatusController } from "./TrustScoreModuleStatusController";
import { TrustScoreController } from "./TrustScoreController";
import { TrustScoreApplicationService } from "./TrustScoreApplicationService";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyTrustReviewEntity, CompanyEntity]),
    SubscriptionModule,
    AuthModule,
  ],
  controllers: [TrustScoreModuleStatusController, TrustScoreController],
  providers: [TrustScoreApplicationService],
  exports: [TrustScoreApplicationService],
})
export class TrustScoreModule {}
