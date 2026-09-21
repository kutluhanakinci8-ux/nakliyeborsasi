import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuctionSessionEntity } from "../../infrastructure/database/entities/AuctionSessionEntity";
import { AuctionBidEntity } from "../../infrastructure/database/entities/AuctionBidEntity";
import { FreightListingEntity } from "../../infrastructure/database/entities/FreightListingEntity";
import { AuctionSessionApplicationService } from "./AuctionSessionApplicationService";
import { AuctionSessionController } from "./AuctionSessionController";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuctionSessionEntity,
      AuctionBidEntity,
      FreightListingEntity,
    ]),
    SubscriptionModule,
    AuthModule,
  ],
  controllers: [AuctionSessionController],
  providers: [AuctionSessionApplicationService],
})
export class AuctionModule {}
