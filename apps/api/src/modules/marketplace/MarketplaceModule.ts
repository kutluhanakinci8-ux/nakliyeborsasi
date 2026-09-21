import { Module } from "@nestjs/common";
import { PlatformFreightListingRepository } from "./PlatformFreightListingRepository";
import { PlatformFreightListingService } from "./PlatformFreightListingService";
import { PlatformFreightListingController } from "./PlatformFreightListingController";
import { SubscriptionModule } from "../subscription/SubscriptionModule";
import { IdentityModule } from "../identity/IdentityModule";

@Module({
  imports: [SubscriptionModule, IdentityModule],
  controllers: [PlatformFreightListingController],
  providers: [PlatformFreightListingRepository, PlatformFreightListingService],
})
export class MarketplaceModule {}
