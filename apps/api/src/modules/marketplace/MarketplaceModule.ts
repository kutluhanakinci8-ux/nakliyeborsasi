import { Module } from "@nestjs/common";
import { PlatformFreightListingRepository } from "./PlatformFreightListingRepository";
import { PlatformFreightListingService } from "./PlatformFreightListingService";
import { PlatformFreightListingController } from "./PlatformFreightListingController";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { AuthModule } from "../auth/AuthModule";

@Module({
  imports: [SubscriptionModule, AuthModule],
  controllers: [PlatformFreightListingController],
  providers: [PlatformFreightListingRepository, PlatformFreightListingService],
})
export class MarketplaceModule {}
